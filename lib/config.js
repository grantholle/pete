'use strict'

const p = require('path')
const fs = require('fs-extra')
const directory = p.join(__dirname, '..', '.config')
const filePath = p.join(directory, 'config.json')

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
    directory
  }
}

config.save = function () {
  this.existing = true

  return fs.writeJson(filePath, this, { spaces: 2 })
}

config.torrentFiles = p.join(directory, 'torrent-files')
config.databaseFilePath = p.join(directory, 'pete.loki.database')

fs.ensureDir(config.torrentFiles)

module.exports = config
