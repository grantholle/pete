'use strict'

const Transmission = require('transmission')

module.exports = config => {
  return new Transmission({
    username: config.user,
    password: config.pw,
    port: config.port,
    host: config.host
  })
}
