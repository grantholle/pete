'use strict'

const os = require('os'),
      p = require('path'),
      config = require(p.join(os.homedir(), '.config', 'pete', 'config.json'))

module.exports = config
