'use strict'

const Eztv = require('eztv-b')

/**
 * Searches for a show episode for a given quality
 *
 * @param {Object} show from the database
 * @param {Object} episode from the tmdb api
 * @param {string} quality HDTV, 720p or 1080p
 * @returns {Promise} The magnet URL or false if no episode was found
 */
Eztv.prototype.searchForEpisode = function (show, episode, quality) {
  // Cache the torrents received
  // in the event that we search multiple qualities
  if (!this.torrents) {
    this.torrents = []
  }

  return new Promise((resolve, reject) => {
    const getAllSEpisodes = () => {
      return new Promise((resolve, reject) => {
        const paginate = page => {
          this.getTorrents({ imdb_id: show.imdb_id, page, limit: 100 }).then(res => {
            this.torrents = this.torrents.concat(res.torrents)

            // If we haven't gathered all the torrents for this show
            // Increase the page and get more
            if (res.torrents_count !== this.torrents.length) {
              return paginate(page++)
            }

            resolve()
          })
        }

        if (this.torrents.length !== 0) {
          return resolve()
        }

        paginate(1)
      })
    }

    getAllSEpisodes().then(() => {
      const highDefiniton = quality === '720p' || quality === '1080p'
      const regularDefintion = quality === 'HDTV'

      // Sort the torrents by seeds
      // so the episodes with the most
      // will be found first
      const torrent = this.torrents.sort((a, b) => a.seeds - b.seeds)
        .find(torrent => {
          if (episode.season_number !== parseFloat(torrent.season) || episode.episode_number !== parseFloat(torrent.episode)) {
            return false
          }

          // EZTV doesn't provide a quality property,
          // so we have to parse the title to determine the quality
          const goodQuality = (highDefiniton && torrent.title.indexOf(quality) !== -1) ||
            (regularDefintion && torrent.title.indexOf('720p') === -1 && torrent.title.indexOf('1080p') === -1)

          return goodQuality
        })

      // Either resolve the magnet url if one was found or false
      resolve(torrent ? torrent.magnet_url : false)
    })
  })
}

/**
 * Clears the torrents cache for a show
 */
Eztv.prototype.clearCache = function () {
  this.torrents = []
}

module.exports = new Eztv()
