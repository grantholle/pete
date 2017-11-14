'use strict'

const winston = require('../logger')
const moviedb = require('../moviedb')
const retrieveDatabase = require('../database')
const movieSearch = require('../movie-search')
const transmission = require('../transmission')
const notify = require('../pushbullet').started
const eachOfSeries = require('async').eachOfSeries
const sanitize = require('sanitize-filename')
const p = require('path')
const MAX_ATTEMPTS = 5

module.exports = config => {
  winston.info('Retrieving movie watchlist...')
  let moviesCollection
  let db

  retrieveDatabase().then(database => {
    moviesCollection = database.movies
    db = database.db

    return moviedb.getMovieWatchlist()
  }).then(res => {
    if (res.total_results === 0) {
      winston.info('No movies found in watchlist')
      return []
    }

    winston.info(`${res.total_results} ${res.total_results > 1 ? 'movies are' : 'movie is'} in your watchlist`)
    return res.results
  }).then(movies => {
    eachOfSeries(movies, (movie, key, callback) => {
      // Find or create the movie
      const existingMovie = moviesCollection.findOne({ tmdb_id: movie.id })
      const download = existingMovie ? existingMovie : moviesCollection.insert({
        tmdb_id: movie.id,
        added: false,
        attempts: 0,
        name: sanitize(movie.title)
      })

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
        if (magnet) {
          const name = `${download.name} (${movie.release_date.substr(0, 4)})`
          return transmission.addMovie(magnet, name)
        }

        // If a magnet wasn't found
        // Increment the attempt count and save
        winston.info(`Could not find ${movie.title}, will try again later`)
        download.attempts++
        moviesCollection.update(download)

        return false
      }).then(torrent => {
        if (!torrent) {
          return
        }

        const msg = `Started download for ${movie.title}`

        // Send a notification that the movie has started downloading
        winston.info(msg)
        notify(msg)

        // Save the download with the transmission id and the path
        download.transmission_id = torrent.id
        download.added = true
        download.completedPath = p.join(config.locations.movies, torrent.name)
        moviesCollection.update(download)

        // After starting the download
        // Remove the movie from the watchlist
        return moviedb.removeMovieFromWatchlist(movie.id)
      })
      .then(() => callback())
      .catch(err => {
        winston.error(err)
        callback()
      })
    }, () => {
      // end of watchlist iteration
      winston.info('Finished checking movie watchlist')
      db.saveDatabase()
    })
  })
}
