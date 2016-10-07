'use strict'

const config = require('./config'),
      moviedb = require('moviedb')(config.tmdb.apiKey)

moviedb.session_id = config.tmdb.sessionId

module.exports = moviedb
