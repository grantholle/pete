'use strict'

const config = require('./config').movies
const yify = require('./yify')
const rarbg = require('./rarbg')

/**
 * This function takes in a movie from tmdb
 * and returns the final magnet url based on
 * config settings and availability
 *
 * @param {Object} movie
 * @returns {string} magnet URL
 */
module.exports = movie => {
  return new Promise((resolve, reject) => {
    const source = config.useYify ? yify : rarbg,
      fallbackSource = config.useYify ? rarbg : false,
      qualities = ['720p', '1080p']

    // We'll give yify a higher priority for searching... I guess
    const search = (searcher, quality) => {
      searcher.searchForMovie(movie, quality).then(magnet => {
        // If there's a result, then yay, return that
        // Or if there's no fallback search source and no more qualities to try
        if (magnet || (!fallbackSource && (qualities.length === 0 || !config.fallback))) {
          return resolve(magnet)
        }

        // If there's a fallback source search using that
        if (fallbackSource) {
          return fallbackSource.searchForMovie(movie, quality).then(magnet => {
            if (magnet || (!config.fallback || qualities.length === 0)) {
              return resolve(magnet)
            }

            search(source, qualities.shift())
          })
        }

        // No fallback and there is still other qualities
        search(source, qualities.shift())
      })
    }

    let quality = qualities.splice(qualities.indexOf(config.quality), 1)
    search(source, quality[0])
  })
}
