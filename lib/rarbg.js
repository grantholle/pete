'use strict'

const RarbgApi = require('rarbg')
const sanitize = require('sanitize-filename')
const labelize = require('./show-label')

  /**
   * Search rarbg for a movie based on certain criterion
   * Movie should be the object from TMdb
   *
   * @param {Object} movie
   * @param {string} quality
   * @returns {Promise}
   */
RarbgApi.prototype.searchForMovie = function (movie, quality) {
  return new Promise(async (resolve, reject) => {
    // Rarbg provides ways of searching based on tmdb and imdb id, but I feel like this would
    // be more reliable, as not all movies have those id's populated
    const searchParams = {
      search_string: `${sanitize(movie.title)} ${movie.release_date.substr(0, 4)}`,
      sort: 'seeders',
      category: this.categories[`MOVIES_X264_${quality.replace('p', '')}`]
    }

    try {
      const results = await this.search(searchParams)
      resolve(results[0].download)
    } catch (err) {
      if (err.message.toLowerCase().includes('no results')) {
        return resolve(false)
      }

      reject(err)
    }
  })
}

  /**
   * Search rarbg for an episode of a show based on quality
   *
   * @param {Object} show from the database
   * @param {Object} episode from the tmdb api
   * @returns {Promise} The magnet URL or false if no episode was found
   */
RarbgApi.prototype.searchForEpisode = function (show, episode, quality) {
  return new Promise(async (resolve, reject) => {
    const searchParams = {
      search_imdb: `tt${show.imdb_id}`,
      search_string: labelize(episode.season_number, episode.episode_number),
      sort: 'seeders',
      category: quality === 'HDTV' ? this.categories.TV_EPISODES : this.categories.TV_HD_EPISODES
    }

    if (!show.imdb_id) {
      delete searchParams.search_imdb
      searchParams.search_string = `${show.name} ${searchParams.search_string}`
    }

    try {
      const results = await this.search(searchParams)
      const goodQuality = quality === 'HDTV' ? results[0] : results.find(r => r.filename.indexOf(quality) !== -1)

      if (goodQuality) {
        return resolve(goodQuality.download)
      }

      resolve(false)
    } catch (err) {
      if (err.message.toLowerCase().includes('no results')) {
        return resolve(false)
      }

      reject(err)
    }
  })
}

module.exports = new RarbgApi()
