'use strict'

const config = require('./config').tmdb
const moviedb = require('moviedb')(config.apiKey)

moviedb.session_id = config.sessionId

const promiseResponse = (methodName, data) => {
  return new Promise((resolve, reject) => {
    moviedb[methodName](data, (err, res) => {
      if (err) {
        return reject(err)
      }

      resolve(res)
    })
  })
}

// Just a wrapper over the api to use promises instead of callbacks...
module.exports = {
  getMovieWatchlist () {
    return promiseResponse('accountMovieWatchlist', { id: '{account_id}' })
  },
  getTvWatchlist () {
    return promiseResponse('accountTvWatchlist', { id: '{account_id}' })
  },
  tvInfo (id) {
    return promiseResponse('tvInfo', { id })
  },
  getSeasonInfo (id, seasonNumber) {
    return promiseResponse('tvSeasonInfo', { id, seasonNumber })
  },
  removeMovieFromWatchlist (mediaId) {
    return promiseResponse('accountWatchlistUpdate', { id: '{account_id}', media_type: 'movie', mediaId, watchlist: false })
  },
  getImdbId (id) {
    return new Promise((resolve, reject) => {
      promiseResponse('tvExternalIds', { id }).then(result => {
        resolve(result.imdb_id && result.imdb_id[0] === 't' ? result.imdb_id.substr(2) : result.imdb_id)
      })
    })
  }
}
