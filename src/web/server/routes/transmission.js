'use strict'

const router = require('express').Router()
const transmissionController = require('../controllers/transmission')

router.get('/torrents', transmissionController.searchTv)
router.get('/torrents/:id', transmissionController.searchMovie)
router.get('/info/tv/:tmdb_id', transmissionController.tvInfo)
router.get('/info/tv/:id/seasons/:season_number', transmissionController.seasonInfo)

module.exports = router
