'use strict'

const winston = require('../logger'),
      moviedb = require('../moviedb'),
      Download = require('../models/download'),
      movieSearch = require('../movie-search'),
      transmission = require('../transmission'),
      notify = require('../pushbullet').downloadStarted,
      eachOfSeries = require('async').eachOfSeries,
      p = require('path'),
      MAX_ATTEMPTS = 5

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
          name: movie.title
        }
      }).then(download => {
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
            download.attempts++
            return download.save().then(callback)
          }

          transmission.addMovie(magnet).then(torrent => {
            winston.info(`Added torrent for ${movie.title}`)

            // Save the download with the transmission id and the path
            download.update({
              transmission_id: torrent.id,
              added: true,
              completedPath: p.join(config.locations.movies, torrent.name)
            })

            // Send a notification that the movie has started downloading
            notify(`Started download for ${movie.title}`)

            // After starting the download
            // Remove the movie from the watchlist
            moviedb.removeMovieFromWatchlist(movie.id).then(callback)
          })
        }).catch(err => {
          winston.error(err)
          callback()
        })
      })
    }, err => winston.info('Finished checking movie watchlist')) // end of watchlist iteration
  })
}
