'use strict'

const config = require('./config').tmdb,
      moviedb = require('moviedb')(config.apiKey)

moviedb.session_id = config.sessionId

// Just a wrapper over the api to use promises instead of callbacks...
module.exports = {
  getMovieWatchlist() {
    return new Promise((resolve, reject) => {
      moviedb.accountMovieWatchlist({ id: '{account_id}' }, (err, res) => {
        if (err) {
          return reject(err)
        }

        resolve(res)
      })
    })
  },
  removeMovieFromWatchlist(media_id) {
    return new Promise((resolve, reject) => {
      moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'movie', media_id, watchlist: false }, err => {
        if (err) {
          return reject(err)
        }

        resolve()
      })
    })
  }
}
