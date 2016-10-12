#!/usr/bin/env node

'use strict'

const torrentId = 97,
      winston = require('./lib/logger'),
      fs = require('fs'),
      showsDb = require('./lib/shows-db'),
      sanitize = require('sanitize-filename'),
      notify = require('./lib/pushbullet'),
      label = require('./lib/show-label')

showsDb.db.get('select * from downloads where transmission_id = ?', [torrentId], (err, show) => {
  const msg = `${show.show} ${label(show.season, show.episode)}, ${show.episode_name}, has finished downloading.`

  winston.info(msg)
  notify(`Cloud City Notification - Torrent Finished`, msg)
})

// 'use strict'
//
// // const rargb = require('rargb'),
// //       write = require('jsonfile').writeFile
// //
// // rargb.search({
// //   search_string: 'Mr. Robot',
// //   sort: 'seeders'
// // }).then(results => {
// //   write('rargb.json', results.torrent_results)
// // }).catch(err => winston.error(err))
//
//
// const showsDb = require('./lib/shows-db'),
//       moviedb = require('./lib/moviedb'),
//       add = false
//
// showsDb.getShows((err, shows) => {
//   Object.keys(shows).forEach((item, index, array) => {
//     if (item !== '1685') {
//       moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'tv', media_id: item, watchlist: add }, err => {
//         if (err)
//         return console.error(err)
//
//         console.log(`Item ${item} ${add ? 'added' : 'removed'}`)
//       })
//     }
//   })
// })
