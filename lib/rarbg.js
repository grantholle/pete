'use strict'

const RargbApi = require('rarbg')

class PeteRargb extends RargbApi {
  /**
   * Search rarbg for a movie based on certain criterion
   * Movie should be the object from TMdb
   *
   * @param {Object} movie
   * @param {string} quality
   * @returns {Promise}
   */
  searchForMovie (movie, quality) {
    new Promise((resolve, reject) => {
      const searchStr = `${sanitize(movie.title)} ${movie.release_date.substr(0, 4)} ${quality}`

      // winston.info(`Searching RARBG using search string: '${searchStr}'`)

      this.search({
        search_string: searchStr,
        sort: 'seeders',
        category: rarbg.categories[`MOVIES_X264_${quality.replace('p', '')}`]
      }).then(results => {
        // winston.info(`Torrent for ${movie.title} (${quality}) found on RARBG`)
        resolve(results.download)
      }).catch(err => {
        if (err.error_code === 20) {
          // winston.info(`Nothing found for ${movie.title} (${quality}) on RARBG.`)
          return resolve(false)
        }

        reject(err)
      })
    })
  }
}

module.exports = new PeteRargb()
