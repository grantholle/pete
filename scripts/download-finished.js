#!/usr/bin/env node
'use strict'

const winston = require('../lib/logger'),
      mediaDb = require('../lib/media-db'),
      kodi = require('kodi-ws'),
      notify = require('../lib/pushbullet').downloadFinished,
      label = require('../lib/show-label')

mediaDb.db.get('select * from downloads where transmission_id = ?', [process.env.TR_TORRENT_ID], (err, item) => {
  let msg

  // If the item doesn't exist in the db, else if the item is a tv show, else it's a movie
  if (!item) {
    msg = `${process.env.TR_TORRENT_NAME} has finished downloading.`
  } else if (item.season) {
    msg = `${item.show} ${label(item.season, item.episode)}, ${item.name}, has finished downloading.`
  } else {
    msg = `${item.name} has finished downloading.`
  }

  // Set the transmission id to null to prevent problems later
  if (item)
    mediaDb.db.run('update downloads set transmission_id = null where id = ?', [item.id])

  // Send a notification
  winston.info(msg)
  notify(msg)

  // Refresh the library
  kodi('localhost', 9090).then(function(connection) {
    connection.VideoLibrary.Scan()
  })
})
