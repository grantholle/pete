'use strict'

const transmission = require('../transmission')
const winston = require('../logger')

/**
 * This function searches through the current torrents.
 * If it finds one that has been stopped due to ratio
 * limit, it will remove that torrent.
 */
module.exports = () => {
  transmission.get().then(results => {
    for (let torrent of results.torrents) {
      if (torrent.seedRatioLimit <= torrent.uploadRatio) {
        transmission.remove(torrent.id).then(args => {
          winston.info(`Seed limit reached for ${torrent.name}. Torrent removed`)
        }).catch(winston.error)
      }
    }
  }).catch(winston.error)
}
