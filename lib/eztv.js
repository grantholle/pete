'use strict'

const Eztv = require('eztv-b')

// Cache the torrents received
// in the event that we search multiple qualities
let torrentCache = []
let lastId

/**
 * Searches for a show episode for a given quality
 *
 * @param {Object} show from the database
 * @param {Object} episode from the tmdb api
 * @param {string} quality HDTV, 720p or 1080p
 * @returns {Promise} The magnet URL or false if no episode was found
 */
Eztv.prototype.searchForEpisode = function (show, episode, quality) {
  if (lastId !== show.imdb_id) {
    torrentCache = []
    lastId = show.imdb_id
  }

  return new Promise(async (resolve, reject) => {
    const getAllSEpisodes = () => {
      return new Promise((resolve, reject) => {
        const paginate = page => {
          const pageSize = 100

          // If this show doesn't have an imdb id, skip it
          if (!show.imdb_id) {
            return resolve()
          }

          this.getTorrents({ imdb_id: show.imdb_id, page, limit: pageSize }).then(res => {
            torrentCache = torrentCache.concat(res.torrents)

            // If we haven't gathered all the torrents for this show
            // Increase the page and get more
            if (!res.torrents || res.torrents.length < pageSize) {
              return resolve()
            }

            return paginate(++page)
          })
        }

        if (torrentCache.length !== 0) {
          return resolve()
        }

        paginate(1)
      })
    }

    try {
      await getAllSEpisodes()
    } catch (err) {
      return reject(err)
    }

    const highDefiniton = quality === '720p' || quality === '1080p'
    const regularDefintion = quality === 'HDTV'

    // Sort the torrents by seeds
    // so the episodes with the most
    // will be found first
    const torrent = torrentCache.sort((a, b) => a.seeds - b.seeds)
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
}

module.exports = new Eztv()
