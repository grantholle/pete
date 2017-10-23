'use strict'

const os = require('os'),
      p = require('path'),
      fs = require('fs-extra'),
      directory = p.join(os.homedir(), '.config', 'pete'),
      filePath = p.join(directory, 'config.json')

let config = {}

// Attempt to get a config,
// otherwise return a new object
try {
  config = require(filePath)
  config.existing = true
} catch (e) {
  config = {
    existing: false,
    web: {
      host: 'localhost',
      port: 3030
    },
    tmdb: {
      apiKey: ''
    },
    pushbullet: {
      token: false,
      notifyOnStart: true,
      notifyOnFinish: true
    },
    transmission: {
      user: '',
      pw: '',
      host: 'localhost',
      port: 9091
    },
    locations: {
      movies: '',
      tv: ''
    },
    movies: {
      quality: '1080p',
      useYify: true,
      fallback: true
    },
    directory,
    databaseFilePath: p.join(directory, 'pete.database')
  }
}

config.save = function () {
  this.existing = true

  return fs.writeJson(filePath, this, { spaces: 2 })
}

module.exports = config
