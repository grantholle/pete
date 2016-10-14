'use strict'

const winston = require('winston'),
      os = require('os'),
      p = require('path'),
      fs = require('fs'),
      mkdirp = require('mkdirp'),
      moment = require('moment'),
      configDir = p.join(os.homedir(), '.config', 'pete')

winston.add(winston.transports.File, {
  filename: p.join(configDir, 'pete.log'),
  maxsize: 1000000,
  maxFiles: 5,
  showLevel: false,
  tailable: true,
  timestamp: () => {
    return moment().format('YYYY-MM-DD h:mm:ss:SSSA')
  }
})

winston.loggers.add('debug', {
  file: {
    filename: p.join(configDir, 'pete.debug.log'),
    maxsize: 1000000,
    maxFiles: 5,
    showLevel: false,
    tailable: true,
    level: 'debug',
    timestamp: () => {
      return moment().format('YYYY-MM-DD h:mm:ss:SSSA')
    }
  },
  console: {}
})

// If the config dir doesn't exist, create it
fs.stat(configDir, (err, stat) => {
  if (err) {
    mkdirp(configDir, err => {
      if (err)
        throw err
    })
  }
})

winston.cli()
module.exports = winston
