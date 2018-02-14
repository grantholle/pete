'use strict'

const router = require('express').Router()
const watchlistController = require('../controllers/watchlists')

router.get('/watchlist/tv', watchlistController.tv)
router.get('/watchlist/movie', watchlistController.movie)
router.post('/watchlist/tv', watchlistController.addTv)
router.post('/watchlist/movie', watchlistController.addMovie)
router.delete('/watchlist/tv/:tmdb_id', watchlistController.removeTv)
router.delete('/watchlist/movie/:tmdb_id', watchlistController.removeMovie)

module.exports = router
