'use strict'

const winston = require('winston')
const config = require('./config')
const p = require('path')
const moment = require('moment')

winston.add(winston.transports.File, {
  filename: p.join(config.directory, 'pete.log'),
  maxsize: 1000000,
  maxFiles: 5,
  showLevel: false,
  tailable: true,
  timestamp: () => moment().format('YYYY-MM-DD h:mm:ss:SSSA')
})

winston.cli()
module.exports = winston
