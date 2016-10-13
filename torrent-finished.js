#!/usr/bin/env node
'use strict'

const torrentId = process.env.TR_TORRENT_ID,
      winston = require('./lib/logger'),
      fs = require('fs'),
      showsDb = require('./lib/shows-db'),
      sanitize = require('sanitize-filename'),
      notify = require('./lib/pushbullet'),
      label = require('./lib/show-label')

showsDb.db.get('select * from downloads where transmission_id = ?', [torrentId], (err, show) => {
  const msg = `${show.show} ${label(show.season, show.episode)}, ${show.episode_name}, has finished downloading.`

  winston.info(msg)
  notify(`Pete says, "Torrent finished!"`, msg)
})
