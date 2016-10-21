#!/usr/bin/env node
'use strict'

const torrentId = process.env.TR_TORRENT_ID,
      winston = require('../lib/logger'),
      fs = require('fs'),
      mediaDb = require('../lib/media-db'),
      sanitize = require('sanitize-filename'),
      notify = require('../lib/pushbullet').downloadFinished,
      label = require('../lib/show-label')

mediaDb.db.get('select * from downloads where transmission_id = ?', [torrentId], (err, item) => {
  const msg

  if (item.season)
    msg = `${item.show} ${label(item.season, item.episode)}, ${item.name}, has finished downloading.`
  else
    msg = `${item.name} has finished downloading.`

  winston.info(msg)
  notify(msg)
})
