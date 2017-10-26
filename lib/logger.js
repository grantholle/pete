'use strict'

const winston = require('winston'),
      config = require('./config'),
      p = require('path'),
      moment = require('moment')

winston.add(winston.transports.File, {
  filename: p.join(config.directory, 'pete.log'),
  maxsize: 1000000,
  maxFiles: 5,
  showLevel: false,
  tailable: true,
  timestamp: () => moment().format('YYYY-MM-DD h:mm:ss:SSSA')
})

winston.loggers.add('queries', {
  transports: [
    new (winston.transports.File) ({
      filename: p.join(config.directory, 'pete.queries.log'),
      maxsize: 1000000,
      maxFiles: 5,
      showLevel: false,
      tailable: true,
      timestamp: () => moment().format('YYYY-MM-DD h:mm:ss:SSSA')
    })
  ]
})

winston.cli()
module.exports = winston
