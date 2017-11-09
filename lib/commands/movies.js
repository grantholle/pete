'use strict'

const winston = require('../logger')
const moviedb = require('../moviedb')
const Download = require('../models/download')
const movieSearch = require('../movie-search')
const transmission = require('../transmission')
const notify = require('../pushbullet').started
const eachOfSeries = require('async').eachOfSeries
const sanitize = require('sanitize-filename')
const p = require('path')
const MAX_ATTEMPTS = 5

module.exports = config => {
  winston.info('Retrieving movie watchlist...')

  moviedb.getMovieWatchlist().then(res => {
    if (res.total_results === 0) {
      winston.info('No movies found in watchlist')
      return []
    }

    winston.info(`${res.total_results} ${res.total_results > 1 ? 'movies are' : 'movie is'} in your watchlist`)
    return res.results
  }).then(movies => {
    eachOfSeries(movies, (movie, key, callback) => {
      // Find or create the movie
      Download.findOrCreate({
        where: {
          tmdb_id: movie.id
        },
        defaults: {
          name: sanitize(movie.title)
        }
      }).then(download => {
        download = download[0]

        // If the downloads exceed the max attempts, remove it from the watchlist
        if (!download.added && download.attempts > MAX_ATTEMPTS) {
          return moviedb.removeMovieFromWatchlist(movie.id).then(() => {
            winston.info(`Max attempts of ${MAX_ATTEMPTS} times searching for ${movie.title} reached. Removed from watchlist.`)
            callback()
          }).catch(err => {
            winston.error(err)
            callback()
          })
        }

        winston.info(`Searching for ${movie.title}...`)

        movieSearch(movie).then(magnet => {
          // If a magnet wasn't found
          // Increment the attempt count and save
          if (!magnet) {
            winston.info(`Could not find ${movie.title}, will try again later`)
            return download.increment('attempts', { by: 1 }).then(() => callback())
          }

          transmission.addMovie(magnet).then(torrent => {
            const msg = `Started download for ${movie.title}`

            // Send a notification that the movie has started downloading
            winston.info(msg)
            notify(msg)

            // Save the download with the transmission id and the path
            download.update({
              transmission_id: torrent.id,
              added: true,
              completedPath: p.join(config.locations.movies, torrent.name)
            })

            // After starting the download
            // Remove the movie from the watchlist
            moviedb.removeMovieFromWatchlist(movie.id).then(() => callback())
          })
        }).catch(err => {
          winston.error(err)
          callback()
        })
      })
    }, () => winston.info('Finished checking movie watchlist')) // end of watchlist iteration
  })
}
