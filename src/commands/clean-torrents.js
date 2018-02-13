'use strict'

const transmission = require('../transmission')
const winston = require('../logger')
const database = require('../database')

/**
 * This function searches through the current torrents.
 * If it finds one that has been stopped due to ratio
 * limit, it will remove that torrent.
 */
module.exports = async options => {
  const results = await transmission.get()

  for (const torrent of results.torrents) {
    if (torrent.seedRatioLimit > torrent.uploadRatio) {
      continue
    }

    try {
      await transmission.remove(torrent.id)
      await database.deleteTorrent(torrent.id)
      winston.info(`Seed limit reached for ${torrent.name}. Torrent removed`)
    } catch (err) {
      winston.error(err)
    }
  }

  if (options.cache) {
    database.deleteTorrents()
  }
}
