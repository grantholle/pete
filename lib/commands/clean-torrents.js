'use strict'

const transmission = require('../transmission')
const winston = require('../logger')

/**
 * This function searches through the current torrents.
 * If it finds one that has been stopped due to ratio
 * limit, it will remove that torrent.
 */
module.exports = () => {
  transmission.get((err, results) => {
    if (err) {
      return winston.error(err)
    }

    for (let torrent in results.torrents) {
      if (torrent.seedRatioLimit <= torrent.uploadRatio) {
        transmission.remove(torrent.id, (err, args) => {
          if (err) {
            return winston.error(err)
          }

          winston.info(`Seed limit reached for ${torrent.name}. Torrent removed`)
        })
      }
    }
  })
}
