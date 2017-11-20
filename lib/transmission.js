'use strict'

const Transmission = require('transmission')
const config = require('./config')
const retrieveDatabase = require('./database')

const addTorrent = (self, magnet, directory, name) => {
  return new Promise((resolve, reject) => {
    retrieveDatabase().then(({ torrents, db }) => {
      self.addUrl(magnet, { 'download-dir': directory }, (err, torrent) => {
        if (err) {
          return reject(err)
        }

        torrents.insert({ transmission_id: torrent.id, name })
        db.saveDatabase().then(() => {
          resolve(torrent)
        })
      })
    })
  })
}

/**
 * Adds a movie torrent based on config's movie setting
 *
 * @param {string} magnet
 * @returns {Promise} The torrent data
 */
Transmission.prototype.addMovie = function (magnet, name) {
  return addTorrent(this, magnet, config.locations.movies, name)
}

Transmission.prototype.addEpisode = function (magnet, directory, name) {
  return addTorrent(this, magnet, directory, name)
}

module.exports = new Transmission({
  username: config.transmission.user,
  password: config.transmission.pw,
  port: config.transmission.port,
  host: config.transmission.host
})
