'use strict'

/**
 * This just takes a season and episode
 * and makes a S##E## label
 *
 * @param {integer|string} season
 * @param {integer|string} episode
 * @returns {string} Something like S01E01
 */
module.exports = (season, episode) => {
  const pad = n => {
    const pad = new Array(3).join('0')
    return (pad + n).slice(-pad.length)
  }

  return `S${pad(season)}E${pad(episode)}`
}
