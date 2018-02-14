'use strict'

const moviedb = require('../../../moviedb')

module.exports = {
  async tv (req, res) {
    const watchlist = await moviedb.accountTvWatchlist()

    res.json({ data: watchlist })
  },

  async movie (req, res) {
    const watchlist = await moviedb.accountMovieWatchlist()

    res.json({ data: watchlist })
  },

  async addTv (req, res) {
    const watchlist = await moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'tv', media_id: req.body, watchlist: true })

    res.json({
      data: watchlist
    })
  },

  async addMovie (req, res) {
    const watchlist = await moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'movie', media_id: req.body, watchlist: true })

    res.json({
      data: watchlist
    })
  },

  async removeTv (req, res) {
    const watchlist = await moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'tv', media_id: req.body, watchlist: false })

    res.json({
      data: watchlist
    })
  },

  async removeMovie (req, res) {
    const watchlist = await moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'movie', media_id: req.body, watchlist: false })

    res.json({
      data: watchlist
    })
  }
}
