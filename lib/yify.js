'use strict'

const yify = require('yify-search')
const moment = require('moment')

class YifySearch {
  /**
   * Search rarbg for a movie based on certain criterion
   * Movie should be the object from TMdb
   *
   * @param {Object} movie
   * @param {string} quality
   * @returns {Promise}
   */
  searchForMovie (movie, quality) {
    return new Promise((resolve, reject) => {
      yify.search(movie.title, (err, results) => {
        if (err) {
          return reject(err)
        }

        // Get the movie with the matching release year
        const releaseDate = moment(movie.release_date, 'YYYY-MM-DD')
        const yifyMovie = results.find(item => item.year === releaseDate.year())

        // If no movie matched, return a falsy result
        if (!yifyMovie) {
          return resolve(false)
        }

        // Resolve the url
        const torrent = yifyMovie.torrents.find(t => t.quality === quality)

        resolve(torrent ? torrent.url : false)
      })
    })
  }
}

module.exports = new YifySearch()
