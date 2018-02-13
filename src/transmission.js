'use strict'

const Transmission = require('transmission-promise')
const config = require('./config')
const database = require('./database')
const notify = require('./pushbullet').started
const winston = require('./logger')

/**
 * Adds a magnet to Transmission, creates an entry in the database,
 * and sends a notification
 *
 * @param {string} magnet The magnet url
 * @param {string} name The final name of the file following Plex's naming conventions
 * @param {string} directory The destination directory
 * @returns {Promise}
 */
Transmission.prototype.addMagnet = function (magnet, name, directory = config.locations.movies) {
  winston.info(`${name}: ${magnet}`)

  return new Promise((resolve, reject) => {
    this.addUrl(magnet, { 'download-dir': directory }).then(torrent => {
      // Send a notification that a download has started
      const msg = `Started download for ${name}`
      winston.info(msg)
      notify(msg)

      database.saveTorrent(torrent.id, name).then(() => {
        resolve(torrent)
      }).catch(reject)
    }).catch(reject)
  })
}

module.exports = new Transmission({
  username: config.transmission.user,
  password: config.transmission.pw,
  port: config.transmission.port,
  host: config.transmission.host
})
