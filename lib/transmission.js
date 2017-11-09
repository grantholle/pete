'use strict'

const Transmission = require('transmission')
const config = require('./config')
const addTorrent = (self, magnet, directory) => {
  return new Promise((resolve, reject) => {
    self.addUrl(magnet, { 'download-dir': directory }, (err, torrent) => {
      if (err) {
        return reject(err)
      }

      resolve(torrent)
    })
  })
}

/**
 * Adds a movie torrent based on config's movie setting
 *
 * @param {string} magnet
 * @returns {Promise} The torrent data
 */
Transmission.prototype.addMovie = function (magnet) {
  return addTorrent(this, magnet, config.locations.movies)
}

Transmission.prototype.addEpisode = function (magnet, directory) {
  return addTorrent(this, magnet, directory)
}

module.exports = new Transmission({
  username: config.transmission.user,
  password: config.transmission.pw,
  port: config.transmission.port,
  host: config.transmission.host
})
