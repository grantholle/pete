#!/usr/bin/env node
'use strict'

// process.env.TR_TORRENT_ID = 4

const winston = require('../lib/logger')
const notify = require('../lib/pushbullet').finished
const retrieveDatabase = require('../lib/database')
const transmission = require('../lib/transmission')
const async = require('async')
const p = require('path')
const torrentId = parseFloat(process.env.TR_TORRENT_ID)

retrieveDatabase().then(database => {
  const torrentsCollection = database.torrents
  const db = database.db
  const torrent = torrentsCollection.findOne({ transmission_id: torrentId })

  if (!torrent) {
    return winston.error(`Could not find id in the torrents collection ${process.env.TR_TORRENT_ID}`)
  }

  transmission.get(torrent.transmission_id, (err, torrents) => {
    if (err) {
      return winston.error(err)
    }

    if (!torrents.torrents[0]) {
      return winston.error(`Could not get information for ${torrent.name}`)
    }

    const torrentInfo = torrents.torrents[0]
    const files = torrentInfo.files

    // Iterate over all the files and rename appropriately
    // Will changing the directory name affect the other
    // renaming because it is different by the time they are changed?
    // It might need to be reversed to do the files first then the root directory
    async.eachOfSeries(files, (file, index, callback) => {
      let newName

      // Rename it appropriately (TV episode or Movie title and year)
      // We're only interested in video and subtitle files
      // and video files that aren't samples
      if (file.name.search(/.(mkv|avi|mp4|mov)$/gi) !== -1) {
        newName = file.name.search(/(sample|rarbg\.com)/gi) === -1 ? torrent.name + p.extname(file.name) : `unwanted ${index}`
      }

      if (!newName) {
        return callback()
      }

      transmission.rename(torrentInfo.id, file.name, newName, callback)
    }, err => {
      if (err) {
        return winston.error(err)
      }

      // Rename the root folder
      if (files[0].name.indexOf('/') !== -1) {
        transmission.rename(torrentInfo.id, p.dirname(files[0].name), torrent.name, err => {
          if (err) {
            return winston.error(err)
          }

          let msg = `${torrent.name} has finished downloading.`

          // Log the message and send a notification about what has been completed
          winston.info(msg)
          notify(msg)

          torrentsCollection.remove(torrent)
          db.saveDatabase()
        })
      }
    })
  })
})
