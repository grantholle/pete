'use strict'

const database = require('../../../database')
const moviedb = require('../../../moviedb')

module.exports = {
  async index (req, res) {
    const media = await database.media()
    // const watchlist = await moviedb.accountTvWatchlist()

    res.json({
      data: media.find({ start_season: { $finite: true } })
      // watchlist: watchlist.results
    })
  },

  async store (req, res) {
    const show = await moviedb.findOrCreateShow(req.body)

    res.json({ data: show })
  },

  async show (req, res) {
    const media = await database.media()
    const show = media.findOne({ tmdb_id: req.params.show_id })

    res.json({
      data: show
    })
  },

  update (req, res) {
    const show = database.saveShow(req.body)

    res.json({
      data: show
    })
  },

  destroy (req, res) {

  }
}
