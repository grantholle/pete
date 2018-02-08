'use strict'

const winston = require('../logger')
const moviedb = require('../moviedb')
const database = require('../database')
const movieSearch = require('../movie-search')
const transmission = require('../transmission')
const MAX_ATTEMPTS = 5

module.exports = async config => {
  winston.info('Retrieving movie watchlist...')
  let res

  try {
    res = await moviedb.accountMovieWatchlist()
  } catch (err) {
    winston.error(err)
  }

  if (res.total_results === 0) {
    winston.info('No movies found in watchlist')
    return
  }

  winston.info(`${res.total_results} ${res.total_results > 1 ? 'movies are' : 'movie is'} in your watchlist`)

  for (const movie of res.results) {
    // Find or create the movie
    let download

    try {
      download = await database.findOrCreateMovie(movie)
    } catch (err) {
      winston.error(err)
      continue
    }

    // If the downloads exceed the max attempts, remove it from the watchlist
    if (!download.added && download.attempts > MAX_ATTEMPTS) {
      try {
        await moviedb.removeMovieFromWatchlist(movie.id)
        winston.info(`Max attempts of ${MAX_ATTEMPTS} times searching for ${movie.title} reached. Removed from watchlist.`)
      } catch (err) {
        winston.error(err)
      } finally {
        continue
      }
    }

    winston.info(`Searching for ${movie.title}...`)

    try {
      const releaseInfo = await moviedb.movieReleaseDates(movie.id)
      const usRelease = releaseInfo.results.find(r => r.iso_3166_1 === 'US')

      if (usRelease) {
        const theatrical = usRelease.release_dates.find(d => d.type === 1 || d.type === 3)

        if (theatrical) {
          movie.release_date = theatrical.release_date
        }
      }

      const magnet = await movieSearch(movie)
      let torrent = false

      if (magnet) {
        const name = `${download.name} (${movie.release_date.substr(0, 4)})`
        torrent = await transmission.addMagnet(magnet, name)
      }

      // If a magnet wasn't found
      // Increment the attempt count and save
      winston.info(`Could not find ${movie.title}, will try again later`)

      download.attempts++
      download.added = !!torrent

      if (download.added) {
        // After starting the download
        // Remove the movie from the watchlist
        await moviedb.removeMovieFromWatchlist(movie.id)
      }

      await database.saveMovie(download)
    } catch (err) {
      winston.error(err)
    }
  }

  winston.info('Finished checking movie watchlist')
}