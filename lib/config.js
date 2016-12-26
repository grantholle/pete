'use strict'

const os = require('os'),
      p = require('path'),
      dir = p.join(os.homedir(), '.config', 'pete'),
      config = require(p.join(dir, 'config.json'))

config.dir.home = dir

module.exports = config
