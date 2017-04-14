'use strict'

const winston = require('./logger'),
      transmission = require('./transmission'),
      eachOfSeries = require('async').eachOfSeries

module.exports = () => {

  transmission.get((err, results) => {
    if (err)
      return winston.error(err)

    if (!results.torrents)
      return winston.info('No torrents to clean')

    eachOfSeries(results.torrents, (torrent, index, torrentIterationCallback) => {

      // Remove the torrent if the ratio limit has been hit to keep transmission clean
      if (torrent.seedRatioLimit <= torrent.uploadRatio) {
        transmission.remove(torrent.id, (err, args) => {
          if (err)
            return winston.error(err)

          winston.info(`Seed limit reached for ${torrent.name}. Torrent removed`)
        })
      }

      torrentIterationCallback()
    })
  })
}
