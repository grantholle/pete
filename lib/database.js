'use strict'

const p = require('path')
const loki = require('lokijs')
const config = require('./config')

module.exports = () => {
  return new Promise(resolve => {
    const db = new loki(p.join(config.directory, 'pete.loki.database'), {
      autoload: true,
      autoloadCallback: databaseInitialize
    })

    function databaseInitialize () {
      let shows = db.getCollection('shows')

      if (!shows) {
        shows = db.addCollection('shows', {
          unique: ['tmdb_id', 'imdb_id'],
          indices: ['tmdb_id', 'imdb_id']
        })
      }

      resolve({ shows, db })
    }
  })
}