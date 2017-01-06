#!/usr/bin/env node
'use strict'

const winston = require('../lib/logger'),
      mediaDb = require('../lib/media-db'),
      kodi = require('kodi-ws'),
      notify = require('../lib/pushbullet').downloadFinished,
      fs = require('fs'),
      p = require('path'),
      label = require('../lib/show-label'),
      eachOfSeries = require('async').eachOfSeries,
      refresh = () => {
        // Refresh the library
        kodi('localhost', 9090).then(connection => {
          connection.VideoLibrary.Scan().then(() => {
            process.nextTick(() => {
              process.exit()
            })
          })
        })
      }

fs.stat(p.join(process.env.TR_TORRENT_DIR, process.env.TR_TORRENT_NAME), (err, stats) => {
  if (err)
    return winston.info('TR_TORRENT_DIR + TR_TORRENT_NAME not found')

  winston.info('TR_TORRENT_DIR + TR_TORRENT_NAME found')
})

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
  if (item) {
    mediaDb.db.run('update downloads set transmission_id = null where id = ?', [item.id])

    // Since right now Transmission doesn't honor unwanted files,
    // we have to manually delete unwanted files
    fs.stat(item.download_dir, (err, stats) => {
      if (err) {
        return winston.error(err)
      }

      if (stats.isDirectory()) {
        fs.readdir(item.download_dir, (err, files) => {
          if (err) {
            return winston.error(err)
          }

          const toDelete = files.filter(filename => {
            return (filename.search(/.(mkv|avi|mp4|srt|idx|sub)$/gi) === -1 ||
                    p.basename(filename, p.extname(filename)).toUpperCase() === 'RARBG.COM' ||
                    filename.search(/sample/gi) !== -1)
          })

          winston.info(`Deleting unwanted files: ${toDelete.join(', ')}`)

          eachOfSeries(toDelete, (filename, i, cb) => {
            fs.unlink(p.join(item.download_dir, filename), err => {
              if (err) {
                winston.error(err)
              }

              cb()
            })
          }, () => {
            refresh()
          })
        })
      } else {
        refresh()
      }
    })
  } else {
    refresh()
  }

  // Send a notification
  winston.info(msg)
  notify(msg)
})
