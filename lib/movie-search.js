'use strict'

const config = require('./config').movies,
      yify = require('./yify'),
      rarbg = require('./rarbg')

/**
 * This function takes in a movie from tmdb
 * and returns the final magnet url based on
 * config settings and availability
 *
 * @param {Object} movie
 * @returns {string} magnet URL
 */
module.exports = movie => {
  // We'll give yify a higher priority for searching... I guess
  const source = config.useYify ? yify : rarbg,
        fallbackSource = config.useYify ? rarbg : false

  return new Promise((resolve, reject) => {
    const search = (searchSource, quality) => {
      return new Promise((resolve, reject) => {
        searchSource.searchForMovie(movie, quality).then(magnet => {
          // If there's a result, then yay, return that
          if (magnet) {
            return resolve(magnet)
          }

          if (config.fallback && quality !== '720p') {
            return searchSource.searchForMovie(movie, '720p').then(magnet => resolve(magnet))
          }

          resolve(false)
        })
      })
    }

    // Use the priority search source
    search(source, config.quality).then(magnet => {
      // If there's a magnet link
      // Or if there's no magnet and no fallback
      // Resolve what was returned
      if (magnet || (!magnet && !fallbackSource)) {
        return resolve(magnet)
      }

      search(fallbackSource, config.quality).then(magnet => resolve(magnet))
    }).catch(err => reject(err))
  })
}