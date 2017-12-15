'use strict'

const transmission = require('../transmission')
const winston = require('../logger')
const async = require('async')
const database = require('../database')

/**
 * This function searches through the current torrents.
 * If it finds one that has been stopped due to ratio
 * limit, it will remove that torrent.
 */
module.exports = () => {
  transmission.get().then(results => {
    async.eachSeries(results.torrents, (torrent, callback) => {
      if (torrent.seedRatioLimit > torrent.uploadRatio) {
        return callback()
      }

      transmission.remove(torrent.id).then(args => {
        return database.deleteTorrent(torrent.id)
      }).then(() => {
        winston.info(`Seed limit reached for ${torrent.name}. Torrent removed`)
        callback()
      }).catch(err => {
        winston.error(err)
        callback()
      })
    })
  }).catch(winston.error)
}
