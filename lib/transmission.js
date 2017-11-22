'use strict'

const Transmission = require('transmission')
const config = require('./config')
const retrieveDatabase = require('./database')
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
    retrieveDatabase().then(({ torrents, db }) => {
      this.addUrl(magnet, { 'download-dir': directory }, (err, torrent) => {
        if (err) {
          return reject(err)
        }

        // Send a notification that a download has started
        const msg = `Started download for ${name}`
        winston.info(msg)
        notify(msg)

        torrents.insert({ transmission_id: torrent.id, name })
        db.saveDatabase(() => {
          resolve(torrent)
        })
      })
    })
  })
}

module.exports = new Transmission({
  username: config.transmission.user,
  password: config.transmission.pw,
  port: config.transmission.port,
  host: config.transmission.host
})
