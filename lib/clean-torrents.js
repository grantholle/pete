'use strict'

const winston = require('./logger'),
      transmission = require('./transmission'),
      eachOfSeries = require('async').eachOfSeries,
      movieDb = require('./media-db'),
      label = require('./show-label'),
      sanitize = require('sanitize-filename'),
      p = require('path')

module.exports = () => {

  transmission.get((err, results) => {
    if (err)
      return winston.error(err)

    if (!results.torrents)
      return winston.info('No torrents to clean')

    eachOfSeries(results.torrents, (torrent, index, torrentIterationCallback) => {
      mediaDb.getDownloadByTransmissionId(torrent.id, (err, download) => {
        if (err) {
          winston.error(err)
          return torrentIterationCallback()
        }

        // If the torrent is downloading, rename to more human-readable format and remove files unwanted
        if (torrent.status === transmission.status.DOWNLOAD && !download.renamed) {
          let unwanted = []

          winston.info(`Cleaning ${download.name} (${torrent.name}) - download id ${download.id}`)

          eachOfSeries(torrent.files, (file, i, fileCb) => {
            if (file.name.search(/.(mkv|avi|mp4|srt)$/gi) === -1 ||
                p.basename(file.name, p.extname(file.name)).toUpperCase() === 'RARBG.COM' ||
                file.name.search(/sample/gi) !== -1) {

              unwanted.push(i)
            }
            // else { // Get ready for rename
            //   let filename = '', directory = ''
            //
            //   // TV episode
            //   if (download.season) {
            //     const s = label(download.season, download.episode)
            //     directory = sanitize(`${s} - ${download.name}`)
            //     filename = directory + p.extname(file.name)
            //   } else { // movie
            //     // maybe todo, rename more pretty-like
            //   }
            // }

            fileCb()
          }, () => { // Finished iterating all the files of the torrent
            transmission.set(torrent.id, { 'files-unwanted': unwanted }, err => {
              if (err)
                return winston.error(err)

              mediaDb.setAsRenamedByTransmissionId(torrent.id)
            })
          })
        } else if (torrent.status === transmission.status.STOPPED) {
          // remove the torrent to keep things clean
          transmission.remove(torrent.hashString, (err, args) => {
            if (err)
              winston.error(err)
          })
        } else if (!download.renamed) { // for those that have been missed
          mediaDb.setAsRenamedByTransmissionId(torrent.id)
        }

        torrentIterationCallback()
      })
    }, () => {
      winston.info('Finished cleaning torrents')
    })
  })
}
