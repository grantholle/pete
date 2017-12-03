#!/usr/bin/env node
'use strict'

const winston = require('../lib/logger')
const notify = require('../lib/pushbullet').finished
const database = require('../lib/database')
const transmission = require('../lib/transmission')
const async = require('async')
const p = require('path')
const ptt = require('parse-torrent-title')
const labelize = require('../lib/show-label')
const torrentId = parseFloat(process.env.TR_TORRENT_ID)

// Load database
database.getTorrent(process.env.TR_TORRENT_NAME).then(torrent => {
  // If there wasn't an entry in our database
  // Parse the name and make a prettier name
  if (!torrent) {
    const parsed = ptt.parse(process.env.TR_TORRENT_NAME)

    torrent = {
      newName: parsed.season ? `${parsed.title} - ${labelize(parsed.season, parsed.episode)}` : `${parsed.title} (${parsed.year})`
    }
  }

  // Fetch the torrent info
  transmission.get(torrentId, (err, torrents) => {
    if (err) {
      return winston.error(err)
    }

    if (!torrents.torrents[0]) {
      return winston.error(`Could not get information for ${torrent.newName}`)
    }

    const torrentInfo = torrents.torrents[0]
    const files = torrentInfo.files

    // Iterate over all the files and rename appropriately
    async.eachOfSeries(files, (file, index, callback) => {
      // Rename it appropriately (TV episode or Movie title and year)
      // We're only interested in non-sample video files
      if (file.name.search(/.(mkv|avi|mp4|mov)$/gi) === -1) {
        return callback()
      }

      const newName = file.name.search(/(sample|rarbg\.com)/gi) === -1 ? torrent.newName + p.extname(file.name) : `unwanted ${index}`
      transmission.rename(torrentId, file.name, newName, callback)
    }, err => {
      if (err) {
        return winston.error(err)
      }

      // Rename the root folder
      if (files[0].name.indexOf('/') !== -1) {
        transmission.rename(torrentId, p.dirname(files[0].name), torrent.newName, winston.error)
      }

      // Log the message and send a notification about what has been completed
      let msg = `${torrent.newName} has finished downloading.`
      winston.info(msg)
      notify(msg)

      // Remove the entry and save the database
      database.deleteTorrent(torrentId)
    })
  })
})
