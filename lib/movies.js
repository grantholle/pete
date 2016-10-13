'use strict'

const config = require('./config'),
      winston = require('./logger'),
      transmission = require('./transmission'),
      rargb = require('rargb'),
      moviedb = require('./moviedb'),
      moment = require('moment'),
      p = require('path'),
      yify = require('yify-search'),
      eachOfSeries = require('async').eachOfSeries,
      sanitize = require('sanitize-filename'),

      searchRargb = (movie, quality, cb) => {
        const searchStr = `${sanitize(movie.title)} ${movie.release_date.substr(0, 4)} ${quality}`

        winston.info(`Searching RARGB using search string: '${searchStr}'`)

        rargb.search({
          search_string: searchStr,
          sort: 'seeders',
          category: rargb.categories[`MOVIES_X264_${quality.replace('p', '')}`]
        }).then(results => {

          if (results.torrent_results && results.torrent_results.length > 0) {
            winston.info(`Torrent for ${movie.title} (${quality}) found on RARGB!`)
            cb(null, results.torrent_results[0].download)
          } else {
            cb(`Nothing found for ${movie.title} (${quality}) on RARGB.`, {})
          }
        }).catch(err => {
          winston.error(err)
          cb(err)
        })
      },

      addToTransmission = (movie, magnetUrl, callback) => {

        transmission.addUrl(magnetUrl, { 'download-dir': config.dir.movies }, (err, torrent) => {
          if (err) {
            winston.error(err)
            return callback(null)
          }

          winston.info(`Added torrent for ${movie.title}!`)

          moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'movie', media_id: movie.id, watchlist: false }, err => {
            if (err)
              winston.error(err)
          })

          callback(null)
          // transmission.rename(torrent.id, p.join(incompleteDir, torrent.name), `${sanitize(movie.title)} (${movie.release_date.substr(0, 4)})`, err => {
          // })
        })
      }

let incompleteDir = ''

transmission.session((err, args) => {
  if (err)
    return winston.error(err)

  incompleteDir = args['incomplete-dir']
})

module.exports = () => {
  winston.info('Retrieving movie watchlist...')
  moviedb.accountMovieWatchlist({ id: '{account_id}' }, (err, watchlistResponse) => {
    if (err)
      return winston.error(err)

    if (watchlistResponse.total_results === 0)
      return winston.info('No movies found in watchlist!')

    winston.info(`${watchlistResponse.total_results} ${watchlistResponse.total_results > 1 ? 'movies are' : 'movie is'} in your watchlist`)

    eachOfSeries(watchlistResponse.results, (movie, key, watchlistIterationCb) => {

      if (config.movies.useYify) {
        winston.info(`Searching YIFY for ${movie.title}...`)

        yify.search(movie.title, (err, results) => {
          if (err) {
            winston.error(err)
            return watchlistIterationCb(null)
          }

          // Get the movie with the matching release year
          const releaseDate = moment(movie.release_date, 'YYYY-MM-DD'),
                yifyMovie = results.find(item => item.year === releaseDate.year()),
                rargbCb = (err, results) => {
                  if (err) {
                    winston.error(err)
                    return watchlistIterationCb(null)
                  }

                  addToTransmission(movie, results, watchlistIterationCb)
                }

          // If no movie matched, search using other engine
          if (yifyMovie) {
            // Get the entry with the matching quality
            let torrent = yifyMovie.torrents.find(item => item.quality === config.movies.quality)

            // If no quality matched, search using other engine at lower resolution
            if (!torrent && config.movies.quality !== '720p') {
              torrent = yifyMovie.torrents.find(item => item.quality === '720p')

              if (!torrent) {
                winston.info(`Nothing found on YIFY for ${movie.title}, 720p.`)
                searchRargb(movie, '720p', rargbCb)
              }
            }

            // If we're at this point, add the torrent
            winston.info(`Found YIFY torrent for ${movie.title}, ${torrent.quality}!`)
            addToTransmission(movie, torrent.url, watchlistIterationCb)
          } else {
            winston.info(`Nothing found on YIFY for ${movie.title}.`)
            searchRargb(movie, config.movies.quality, rargbCb)
          }
        })
      } else {
        // search other source
        watchlistIterationCb(null)
      }
    }, err => {

    }) // end of watchlist iteration
  })
}
