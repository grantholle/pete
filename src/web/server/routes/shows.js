'use strict'

const router = require('express').Router()
const showController = require('../controllers/shows')

router.get('/shows', showController.index)
router.post('/shows', showController.store)
router.get('/shows/:show_id', showController.show)
router.put('/shows/:show_id', showController.update)
router.delete('/shows/:show_id', showController.destroy)

module.exports = router
