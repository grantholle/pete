'use strict'

const moviedb = require('../../../moviedb')
const MovieDb = require('moviedb-promise')

module.exports = {
  async searchTv (req, res) {
    const results = await moviedb.searchTv(req.query)

    res.json({ data: results })
  },

  async searchMovie (req, res) {
    const results = await moviedb.searchMovie(req.query)

    res.json({ data: results })
  },

  async tvInfo (req, res) {
    const info = await moviedb.tvInfo(req.params.tmdb_id)

    res.json({ data: info })
  },

  async seasonInfo (req, res) {
    const info = await moviedb.tvSeasonInfo(req.params)

    res.json({ data: info })
  },

  async token (req, res) {
    const tmdb = new MovieDb(req.body)
    let results

    try {
      results = await tmdb.requestToken()
    } catch (err) {
      return res.status(422).json({ message: err.message })
    }

    res.json({ data: results })
  },

  async session (req, res) {
    const tmdb = new MovieDb(req.body)
    const sessionId = await tmdb.session()

    res.json({ data: sessionId })
  }
}
