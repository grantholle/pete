'use strict'

const router = require('express').Router()
const configController = require('../controllers/config')

router.get('/config', configController.index)
router.post('/config', configController.update)

module.exports = router
