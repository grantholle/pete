'use strict'

const Transmission = require('transmission'),
      config = require('./config').transmission

module.exports = new Transmission({
  username: config.user,
  password: config.pw,
  port: config.port,
  host: config.host
})
