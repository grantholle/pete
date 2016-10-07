'use strict'

const os = require('os'),
      p = require('path'),
      configDir = p.join(os.homedir(), '.config', 'cloud-city'),
      path = p.join(configDir, 'shows.json'),
      shows = require(path),
      jsonfile = require('jsonfile')

jsonfile.spaces = 2

module.exports = {
  shows,
  configDir,
  save: (cb) => {
    jsonfile.writeFile(path, module.exports.shows, cb('Shows config has been saved!'))
  }
}
