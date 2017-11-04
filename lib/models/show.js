'use strict'

const Sequelize = require('sequelize'),
      sequelize = require('../connection')

const Show = sequelize.define('show', {
  name: Sequelize.STRING,
  tmdb_id: {
    type: Sequelize.INTEGER,
    unique: true
  },
  imdb_id: Sequelize.STRING,
  start_season: Sequelize.INTEGER,
  start_episode: {
    type: Sequelize.INTEGER,
    defaultValue: 1
  },
  quality: {
    type: Sequelize.STRING,
    defaultValue: 'HDTV'
  },
  next_air_date: Sequelize.DATEONLY,
  use_alternate_quality: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  }
})

module.exports = Show
