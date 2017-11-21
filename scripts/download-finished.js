#!/usr/bin/env node
'use strict'

const winston = require('../lib/logger')
const notify = require('../lib/pushbullet').finished
const retrieveDatabase = require('../lib/database')
const transmission = require('../lib/transmission')
const async = require('async')
const p = require('path')
const torrentId = parseFloat(process.env.TR_TORRENT_ID)
const ptt = require('parse-torrent-title')
const labelize = require('../lib/show-label')

// Load database
retrieveDatabase().then(database => {
  const torrentsCollection = database.torrents
  const db = database.db
  let torrent = torrentsCollection.findOne({ transmission_id: torrentId })
  const existingTorrent = !!torrent

  // If there wasn't an entry in our database
  // Parse the name and make a prettier name
  if (!existingTorrent) {
    const parsed = ptt.parse(process.env.TR_TORRENT_NAME)
    const name = parsed.season ? `${parsed.title} - ${labelize(parsed.season, parsed.episode)}` : `${parsed.title} (parsed.year)`

    torrent = {
      transmission_id: process.env.TR_TORRENT_ID,
      name
    }
  }

  // Fetch the torrent info
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
    async.eachOfSeries(files, (file, index, callback) => {
      let newName

      // Rename it appropriately (TV episode or Movie title and year)
      // We're only interested in non-sample video files
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
        transmission.rename(torrentInfo.id, p.dirname(files[0].name), torrent.name, winston.error)
      }

      // Log the message and send a notification about what has been completed
      let msg = `${torrent.name} has finished downloading.`
      winston.info(msg)
      notify(msg)

      // Remove the entry and save the database
      if (existingTorrent) {
        torrentsCollection.remove(torrent)
        db.saveDatabase()
      }
    })
  })
})
