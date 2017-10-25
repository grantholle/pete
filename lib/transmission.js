'use strict'

const Transmission = require('transmission'),
      config = require('./config')

Transmission.prototype.addMovie = function (magnet) {
  return new Promise((resolve, reject) => {
    this.addUrl(magnetUrl, { 'download-dir': config.locations.movies }, (err, torrent) => {
      if (err) {
        return reject(err)
      }

      resolve(torrent)
    })
  })
}

// downloadTorrentFileFromMagnetThenAddToTransmission = (movie, magnetUrl, callback) => {

//   // Add the torrent to webtorrent client to inspect the files before adding them to transmission
//   torrentClient.add(magnetUrl)

//   // Once the metadata is downloaded, comb files to weed out the junk we don't want
//   torrentClient.on('torrent', torrent => {
//     let unwanted = []
//     const torrentFilePath = p.join(config.dir.home, 'torrent-files', `${torrent.name}.torrent`)

//     // write the torrent file
//     fs.writeFile(torrentFilePath, torrent.torrentFile, () => {

//       // Iterate the files
//       eachOfSeries(torrent.files, (file, i, torrentFileCb) => {
//         if (file.name.search(/.(mkv|avi|mp4|srt|idx|sub)$/gi) === -1 ||
//           p.basename(file.name, p.extname(file.name)).toUpperCase() === 'RARBG.COM' ||
//           file.name.search(/sample/gi) !== -1) {

//           unwanted.push(i)
//         }

//         torrentFileCb()
//       }, () => {
//         // Destroy this torrent since we don't need it anymore
//         torrent.destroy()

//         // After getting the unwanted files, add to transmission
//         transmission.add(torrentFilePath, { 'download-dir': config.dir.movies, 'files-unwanted': unwanted }, (err, torrent) => {
//           if (err) {
//             winston.error(err)
//             return callback(null)
//           }

//           const title = `${sanitize(movie.title)} (${movie.release_date.substr(0, 4)})`
//           winston.info(`Added torrent for ${movie.title}`)
//           mediaDb.addMovieDownload({ tmdb_id: movie.id, transmission_id: torrent.id, transmission_name: torrent.name, title: title, dir: p.join(config.dir.movies, torrent.name) })
//           notify(`Started download for ${movie.title}`)

//           moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'movie', media_id: movie.id, watchlist: false }, err => {
//             if (err)
//               winston.error(err)
//           })

//           callback(null)
//         })
//       })
//     })
//   })
// }

module.exports = new Transmission({
  username: config.user,
  password: config.pw,
  port: config.port,
  host: config.host
})
