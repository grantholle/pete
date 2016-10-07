'use strict'

const os = require('os'),
      p = require('path'),
      config = require(p.join(os.homedir(), '.config', 'cloud-city', 'config.json'))

module.exports = config
