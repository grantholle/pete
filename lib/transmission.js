'use strict'

const Transmission = require('transmission')
const WebTorrent = require('webtorrent')
const config = require('./config')
const fs = require('fs-extra')
const p = require('path')
const async = require('async')

const addTorrent = (self, magnet, directory, finalName) => {
  const client = new WebTorrent()
  let torrentInfo

  return new Promise((resolve, reject) => {
    // Add the magnet to start downloading the torrent file
    client.add(magnet, torrent => {
      const torrentPath = p.join(config.torrentFiles, `${name}.torrent`)

      // Write the torrent file to the filesystem
      fs.writeFile(torrentPath, torrent.torrentFile, err => {
        if (err) {
          return reject(err)
        }

        // Destroy the webtorrent client
        client.destroy()

        // Add the torrent file to Transmission
        self.addFile(torrentPath, { 'download-dir': directory }, (err, torrent) => {
          if (err) {
            return reject(err)
          }

          torrentInfo = torrent

          // Get the information about the recently added torrent file
          self.get(torrent.id, (err, torrents) => {
            if (err) {
              return reject(err)
            }

            if (!torrents.torrents[0]) {
              return reject(new Error(`Could not get information for ${torrentInfo.name}`))
            }

            // Iterate over all the files and rename appropriately
            // Will changing the directory name affect the other
            // renaming because it is different by the time they are changed?
            // It might need to be reversed to do the files first then the root directory
            asnyc.eachOfSeries(files, (file, index, callback) => {
              let newName = `unwanted useless garbage ${index}`

              // If this file/folder is the root,
              // Rename it appropriately (TV episode or Movie title and year)
              // We're only interested in video files
              // and video files that aren't samples
              if (
                file.name.indexOf('/') === -1 ||
                file.name.search(/.(mkv|avi|mp4|mov)$/gi) !== -1 ||
                file.name.search(/(sample|rarbg\.com)/gi) === -1
              ) {
                newName = finalName
              }

              transmission.rename(id, file.name, newName, callback)
            }, err => {
              if (err) {
                return reject(err)
              }

              // We're done renaming, resolve the new torrent information
              self.get(torrentInfo.id, (err, torrents) => {
                if (err) {
                  return reject(err)
                }

                resolve(torrents.torrents[0])
              })
            })
          })
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
