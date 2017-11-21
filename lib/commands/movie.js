'use strict'

const winston = require('../logger')
const moviedb = require('../moviedb')
const movieSearch = require('../movie-search')
const transmission = require('../transmission')
const sanitize = require('sanitize-filename')

module.exports = (config, tmdbId) => {
  winston.info(`Looking up ID ${tmdbId}...`)
  let movie

  moviedb.movieInfo(tmdbId).then(res => {
    movie = res

    winston.info(`Searching for ${movie.title}...`)
    return moviedb.movieReleaseDates(tmdbId)
  }).then(releaseInfo => {
    const usRelease = releaseInfo.results.find(r => r.iso_3166_1 === 'US')

    if (usRelease) {
      const theatrical = usRelease.release_dates.find(d => d.type === 1)

      if (theatrical) {
        movie.release_date = theatrical.release_date
      }
    }

    return movieSearch(movie)
  }).then(magnet => {
    if (!magnet) {
      return winston.info(`Could not find a download for ${movie.title}`)
    }

    winston.info(`Download found, adding to Transmission...`)

    const name = `${sanitize(movie.title)} (${movie.release_date.substr(0, 4)})`
    transmission.addMagnet(magnet, name)
  }).catch(winston.error)
}
