'use strict'

// const rargb = require('rargb'),
//       write = require('jsonfile').writeFile
//
// rargb.search({
//   search_string: 'Mr. Robot',
//   sort: 'seeders'
// }).then(results => {
//   write('rargb.json', results.torrent_results)
// }).catch(err => winston.error(err))


const showsDb = require('./lib/shows-db'),
      moviedb = require('./lib/moviedb'),
      add = false

showsDb.getShows((err, shows) => {
  Object.keys(shows).forEach((item, index, array) => {
    if (item !== '37678') {
      moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'tv', media_id: item, watchlist: add }, err => {
        if (err)
        return console.error(err)

        console.log(`Item ${item} ${add ? 'added' : 'removed'}`)
      })
    }
  })
})
