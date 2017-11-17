'use strict'

const winston = require('../logger')
const moviedb = require('../moviedb')
const movieSearch = require('../movie-search')
const transmission = require('../transmission')
const notify = require('../pushbullet').started
const sanitize = require('sanitize-filename')

module.exports = (config, tmdbId) => {
  winston.info(`Looking up ID ${tmdbId}...`)
  let movie

  moviedb.movieInfo(tmdbId).then(res => {
    movie = res

    winston.info(`Searching for ${movie.title}...`)
    return movieSearch(movie)
  }).then(magnet => {
    if (magnet) {
      winston.info(`Download found, adding to Transmission...`)
      const name = `${sanitize(movie.title)} (${movie.release_date.substr(0, 4)})`
      return transmission.addMovie(magnet, name)
    }

    // If a magnet wasn't found
    // Increment the attempt count and save
    winston.info(`Could not find a download for ${movie.title}`)

    return false
  }).then(torrent => {
    if (!torrent) {
      return
    }

    // Send a notification that the movie has started downloading
    const msg = `Started download for ${movie.title}`
    winston.info(msg)
    notify(msg)
  }).catch(winston.error)
}
