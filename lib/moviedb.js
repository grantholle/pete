'use strict'

const config = require('./config').tmdb
const MovieDb = require('moviedb')

/**
 * This is just syntactic sugar around account watchlist update
 *
 * @param {Integer} media_id
 */
/* eslint camelcase: 0 */
MovieDb.prototype.removeMovieFromWatchlist = function (media_id) {
  return this.accountWatchlistUpdate({ id: '{account_id}', media_type: 'movie', media_id, watchlist: false })
}

/**
 * A wrapper around external ids that just gets the imdb id
 *
 * @param {Integer} id The id of the item for which you want to get the imdb id
 */
MovieDb.prototype.getImdbId = function (id) {
  return this.tvExternalIds(id)
    .then(result => result.imdb_id && result.imdb_id[0] === 't' ? result.imdb_id.substr(2) : result.imdb_id)
}

const moviedb = new MovieDb(config.apiKey)

if (config.sessionId) {
  moviedb.sessionId = config.sessionId
}

module.exports = moviedb
