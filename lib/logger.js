'use strict'

const winston = require('winston'),
      os = require('os'),
      p = require('path'),
      fs = require('fs'),
      mkdirp = require('mkdirp'),
      moment = require('moment'),
      configDir = p.join(os.homedir(), '.config', 'cloud-city'),
      filePath = p.join(configDir, 'cloud-city.log')

winston.add(winston.transports.File, {
  filename: filePath,
  maxsize: 1000000,
  maxFiles: 5,
  showLevel: false,
  tailable: true,
  timestamp: () => {
    return moment().format('YYYY-MM-DD h:mm:ss:SSS a')
  }
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
