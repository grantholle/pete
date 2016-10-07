'use strict'

const shows = require('./lib/config-shows'),
      showsConfig = shows.shows,
      moviedb = require('./lib/moviedb'),
      add = true

Object.keys(showsConfig).forEach((item, index, array) => {
  if (item !== '62286') {
    moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'tv', media_id: item, watchlist: add }, err => {
      if (err)
        return console.error(err)

      console.log(`Item ${item} ${add ? 'added' : 'removed'}`)
    })
  }
})
