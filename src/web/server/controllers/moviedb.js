'use strict'

const moviedb = require('../../../moviedb')

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
  }
}
