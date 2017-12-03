'use strict'

const winston = require('../logger')
const moviedb = require('../moviedb')
const database = require('../database')
const movieSearch = require('../movie-search')
const transmission = require('../transmission')
const eachOfSeries = require('async').eachOfSeries
const MAX_ATTEMPTS = 5

module.exports = config => {
  winston.info('Retrieving movie watchlist...')

  moviedb.accountMovieWatchlist().then(res => {
    if (res.total_results === 0) {
      winston.info('No movies found in watchlist')
      return []
    }

    winston.info(`${res.total_results} ${res.total_results > 1 ? 'movies are' : 'movie is'} in your watchlist`)
    return res.results
  }).then(movies => {
    eachOfSeries(movies, (movie, key, callback) => {
      // Find or create the movie
      let download

      database.findOrCreateMovie(movie).then(res => {
        download = res

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

        moviedb.movieReleaseDates(movie.id).then(releaseInfo => {
          const usRelease = releaseInfo.results.find(r => r.iso_3166_1 === 'US')

          if (usRelease) {
            const theatrical = usRelease.release_dates.find(d => d.type === 1 || d.type === 3)

            if (theatrical) {
              movie.release_date = theatrical.release_date
            }
          }

          return movieSearch(movie)
        }).then(magnet => {
          if (magnet) {
            const name = `${download.name} (${movie.release_date.substr(0, 4)})`
            return transmission.addMagnet(magnet, name)
          }

          // If a magnet wasn't found
          // Increment the attempt count and save
          winston.info(`Could not find ${movie.title}, will try again later`)

          return false
        }).then(torrent => {
          download.attempts++
          download.added = !!torrent

          if (!download.added) {
            return
          }

          // After starting the download
          // Remove the movie from the watchlist
          return moviedb.removeMovieFromWatchlist(movie.id)
        }).then(() => {
          return database.saveMovie(download)
        }).then(() => {
          callback()
        }).catch(err => {
          winston.error(err)
          callback()
        })
      })
    }, () => {
      // end of watchlist iteration
      winston.info('Finished checking movie watchlist')
    })
  })
}
