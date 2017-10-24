'use strict'

const yify = require('yify-search'),
      moment = require('moment')

class YifySearch {
  /**
   * Search rarbg for a movie based on certain criterion
   * Movie should be the object from TMdb
   *
   * @param {Object} movie
   * @param {string} quality
   * @returns {Promise}
   */
  searchForMovie(movie, quality) {
    return new Promise((resolve, reject) => {
      yify.search(movie.title, (err, results) => {
        if (err) {
          return reject(err)
        }

        // Get the movie with the matching release year
        const releaseDate = moment(movie.release_date, 'YYYY-MM-DD'),
              yifyMovie = results.find(item => item.year === releaseDate.year() && item.quality === quality)

        // If no movie matched, return a falsy result
        if (!yifyMovie) {
          return resolve(false)
        }

        // Resolve the url
        resolve(torrent.url)
      })
    })
  }
}

module.exports = new YifySearch()
