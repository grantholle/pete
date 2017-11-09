#!/usr/bin/env node
'use strict'

// process.env.TR_TORRENT_DIR = '/media/media/Movies'
// process.env.TR_TORRENT_NAME = 'The.Truman.Show.1998.1080p.BluRay.x264-TiMELORDS'
// process.env.TR_TORRENT_ID = 72

const winston = require('../lib/logger'),
  mediaDb = require('../lib/media-db'),
  kodi = require('kodi-ws'),
  notify = require('../lib/pushbullet').downloadFinished,
  fs = require('fs'),
  p = require('path'),
  label = require('../lib/show-label'),
  eachOfSeries = require('async').eachOfSeries,
  downloadPath = p.join(process.env.TR_TORRENT_DIR, process.env.TR_TORRENT_NAME),
  transmission = require('../lib/transmission'),
  refresh = () => {
        // Refresh the library
    kodi('localhost', 9090).then(connection => {
      connection.VideoLibrary.Scan().then(() => {
        winston.info('Scanned library')
        process.nextTick(() => {
          process.exit()
        })
      })
    })
  }

mediaDb.db.get('select * from downloads where transmission_id = ?', [process.env.TR_TORRENT_ID], (err, item) => {
  if (err) {
    winston.error('Error in finished script', err)
  }

  let msg

  // If the item doesn't exist in the db, else if the item is a tv show, else it's a movie
  if (!item) {
    msg = `${process.env.TR_TORRENT_NAME} has finished downloading.`
  } else {
    // Set the transmission id to null to prevent problems later
    mediaDb.db.run('update downloads set transmission_id = null where id = ?', [item.id])

    if (item.season) {
      msg = `${item.show} ${label(item.season, item.episode)}, ${item.name}, has finished downloading.`
    } else {
      msg = `${item.name} has finished downloading.`
    }
  }

  // Send a notification
  winston.info(msg)
  notify(msg)

  renameUnwanted()
})

// Since deleting files causes issues with seeding,
// Just rename the unwanted files so Kodi doesn't
// think they're 'real' video files
function renameUnwanted () {
  const id = parseInt(process.env.TR_TORRENT_ID, 10)

  transmission.get(id, (err, args) => {
    const torrent = args.torrents[0]

    if (!torrent) {
      return winston.error(`Could not find transmission id ${process.env.TR_TORRENT_ID} for post processing`)
    }

    eachOfSeries(torrent.files, (file, index, cb) => {
      if (file.name.search(/.*(sample|rarbg\.com).*.(mkv|avi|mp4|mov)$/gi) !== -1) {
        transmission.rename(id, file.name, 'unwanted', (err, args) => {
          if (err) {
            winston.error(err)
          }

          cb()
        })
      } else {
        cb()
      }
    }, () => {
      refresh()
    })
  })
}

function removeUnwanted () {
  // Since right now Transmission doesn't honor unwanted files,
  // we have to manually delete unwanted files
  fs.stat(downloadPath, (err, stats) => {
    if (err) {
      return winston.error(err)
    }

    if (stats.isDirectory()) {
      fs.readdir(downloadPath, (err, files) => {
        if (err) {
          return winston.error(`Reading ${downloadPath} failed`, err)
        }

        const toDelete = files.filter(filename => {
          return (filename.search(/.(mkv|avi|mp4|srt|idx|sub)$/gi) === -1 ||
                  p.basename(filename, p.extname(filename)).toUpperCase() === 'RARBG.COM' ||
                  filename.search(/sample/gi) !== -1)
        })

        winston.info(`Deleting unwanted files: ${toDelete.join(', ')}`)

        eachOfSeries(toDelete, (filename, i, cb) => {
          fs.unlink(p.join(downloadPath, filename), err => {
            if (err) {
              winston.error(`Error deleting file ${p.join(downloadPath, filename)}`, err)
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
}
