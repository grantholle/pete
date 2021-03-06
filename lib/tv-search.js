'use strict'

const eztv = require('./eztv')
const rarbg = require('./rarbg')

/**
 * Searches for an episode of a show given the desired quality
 * and searches eztv and rarbg for the ideal episode
 *
 * @param {Object} show The populated show model
 * @param {Object} episode The episode object from TMdb
 * @returns {Promise} Resolves to either magnet URL if one is found or false
 */
module.exports = (show, episode, fallback = true) => {
  return new Promise((resolve, reject) => {
    const qualities = ['HDTV', '720p', '1080p']
    const search = async (show, episode, quality) => {
      // Check rarbg first for the desired quality
      const searchEztv = async () => {
        // Check eztv second because it's quite a big more
        // involved to search for an episode
        try {
          const magnet = await eztv.searchForEpisode(show, episode, quality)
          // Either resolve the found magnet url
          // or false if we've gone through all qualities
          if (magnet || qualities.length === 0 || (!fallback && !magnet)) {
            return resolve(magnet)
          }
        } catch (err) {
          search(show, episode, qualities.shift())
        }

        // Everthing failed for this quality, try the next one
        search(show, episode, qualities.shift())
      }

      try {
        const magnet = await rarbg.searchForEpisode(show, episode, quality)

        if (magnet) {
          return resolve(magnet)
        }

        searchEztv()
      } catch (err) {
        // If it fails for rarbg, attempt to do eztv
        searchEztv()
      }
    }

    // We'll remove the quality we want from the arrays
    // and search for that first, if that fails we'll continue
    // until we've exhausted all options
    const quality = qualities.splice(qualities.indexOf(show.quality), 1)
    search(show, episode, quality[0])
  })
}
