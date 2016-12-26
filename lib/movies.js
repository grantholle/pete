'use strict'

let searchedAlready = false

const config = require('./config'),
      winston = require('./logger'),
      transmission = require('./transmission'),
      rarbg = require('rarbg'),
      moviedb = require('./moviedb'),
      mediaDb = require('./media-db'),
      notify = require('./pushbullet').downloadStarted,
      moment = require('moment'),
      p = require('path'),
      fs = require('fs'),
      yify = require('yify-search'),
      eachOfSeries = require('async').eachOfSeries,
      sanitize = require('sanitize-filename'),
      WebTorrent = require('webtorrent'),
      torrentClient = new WebTorrent(),
      MAX_ATTEMPTS = 5,

      searchRarbg = (movie, quality, cb) => {
        const searchStr = `${sanitize(movie.title)} ${movie.release_date.substr(0, 4)} ${quality}`

        winston.info(`Searching RARBG using search string: '${searchStr}'`)

        rarbg.search({
          search_string: searchStr,
          sort: 'seeders',
          category: rarbg.categories[`MOVIES_X264_${quality.replace('p', '')}`]
        }).then(results => {
          winston.info(`Torrent for ${movie.title} (${quality}) found on RARBG`)
          cb(null, results[0].download)
        }).catch(err => {
          if (err.error_code === 20 && !searchedAlready && config.movies.fallback) {
            let alt = quality === '1080p' ? '720p' : '1080p'
            searchedAlready = true
            winston.info(`Nothing found for ${movie.title} (${quality}) on RARBG. Attempting search in ${alt}`)
            return searchRarbg(movie, alt, cb)
          } else if (err.error_code === 20) {
            winston.info(`Nothing found for ${movie.title} on RARBG.`)
            return mediaDb.incrementMovieAttempt(movie.id, () => {})
          }

          cb(err)
        })
      },

      addToTransmission = (movie, magnetUrl, callback) => {

        // Add the torrent to webtorrent client to inspect the files before adding them to transmission
        torrentClient.add(magnetUrl)

        // Once the metadata is downloaded, comb files to weed out the junk we don't want
        torrentClient.on('torrent', torrent => {
          let unwanted = []
          const torrentFilePath = p.join(config.dir.home, 'torrent-files', `${torrent.name}.torrent`)

          // write the torrent file
          fs.writeFile(torrentFilePath, torrent.torrentFile, () => {

            // Iterate the files
            eachOfSeries(torrent.files, (file, i, torrentFileCb) => {
              if (file.name.search(/.(mkv|avi|mp4|srt|idx|sub)$/gi) === -1 ||
              p.basename(file.name, p.extname(file.name)).toUpperCase() === 'RARBG.COM' ||
              file.name.search(/sample/gi) !== -1) {

                unwanted.push(i)
              }

              torrentFileCb()
            }, () => {
              // Destroy this torrent since we don't need it anymore
              torrent.destroy()

              // After getting the unwanted files, add to transmission
              transmission.add(torrentFilePath, { 'download-dir': config.dir.movies, 'files-unwanted': unwanted }, (err, torrent) => {
                if (err) {
                  winston.error(err)
                  return callback(null)
                }

                const title = `${sanitize(movie.title)} (${movie.release_date.substr(0, 4)})`
                winston.info(`Added torrent for ${movie.title}`)
                mediaDb.addMovieDownload({ tmdb_id: movie.id, transmission_id: torrent.id, transmission_name: torrent.name, title: title, dir: p.join(config.dir.movies, torrent.name) })
                notify(`Started download for ${movie.title}`)

                moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'movie', media_id: movie.id, watchlist: false }, err => {
                  if (err)
                    winston.error(err)
                })

                callback(null)
              })
            })
          })
        })
      }

module.exports = () => {
  winston.info('Retrieving movie watchlist...')
  moviedb.accountMovieWatchlist({ id: '{account_id}' }, (err, watchlistResponse) => {
    if (err)
      return winston.error(err)

    if (watchlistResponse.total_results === 0)
      return winston.info('No movies found in watchlist')

    winston.info(`${watchlistResponse.total_results} ${watchlistResponse.total_results > 1 ? 'movies are' : 'movie is'} in your watchlist`)

    eachOfSeries(watchlistResponse.results, (movie, key, watchlistIterationCb) => {
      const rarbgCb = (err, results) => {
        if (err) {
          winston.error(err)
          return watchlistIterationCb(null)
        }

        addToTransmission(movie, results, watchlistIterationCb)
      }

      searchedAlready = false

      mediaDb.getMovieAttempts(movie.id, (err, attempts) => {
        if (attempts > MAX_ATTEMPTS) {
          moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'movie', media_id: movie.id, watchlist: false }, err => {
            if (err)
              winston.error(err)

            winston.info(`Max attempts of ${MAX_ATTEMPTS} times searching for ${movie.title} reached. Removed from watchlist.`)
          })

          return watchlistIterationCb(null)
        }


        if (config.movies.useYify) {
          winston.info(`Searching YIFY for ${movie.title}...`)

          yify.search(movie.title, (err, results) => {
            if (err) {
              winston.error(err)
              return watchlistIterationCb(null)
            }

            // Get the movie with the matching release year
            const releaseDate = moment(movie.release_date, 'YYYY-MM-DD'),
                  yifyMovie = results.find(item => item.year === releaseDate.year())

            // If no movie matched, search using other engine
            if (yifyMovie) {
              // Get the entry with the matching quality
              let torrent = yifyMovie.torrents.find(item => item.quality === config.movies.quality)

              // If no quality matched, search using other engine at lower resolution
              if (!torrent && config.movies.quality !== '720p') {
                torrent = yifyMovie.torrents.find(item => item.quality === '720p')

                if (!torrent) {
                  winston.info(`Nothing found on YIFY for ${movie.title}, 720p.`)
                  searchRarbg(movie, '720p', rarbgCb)
                }
              }

              // If we're at this point, add the torrent
              winston.info(`Found YIFY torrent for ${movie.title}, ${torrent.quality}`)
              addToTransmission(movie, torrent.url, watchlistIterationCb)
            } else {
              winston.info(`Nothing found on YIFY for ${movie.title}.`)
              searchRarbg(movie, config.movies.quality, rarbgCb)
            }
          })
        } else {
          // search RARBG
          searchRarbg(movie, config.movies.quality, rarbgCb)
        }
      })
    }, err => {
      // Destroy the client
      torrentClient.destroy()

      winston.info('Finished checking movie watchlist')
    }) // end of watchlist iteration
  })
}
