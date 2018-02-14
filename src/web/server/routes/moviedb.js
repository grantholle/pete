'use strict'

const router = require('express').Router()
const movieDbController = require('../controllers/moviedb')

router.get('/search/tv', movieDbController.searchTv)
router.get('/search/movie', movieDbController.searchMovie)
router.get('/info/tv/:tmdb_id', movieDbController.tvInfo)
router.get('/info/tv/:id/seasons/:season_number', movieDbController.seasonInfo)

module.exports = router
