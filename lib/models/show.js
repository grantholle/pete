'use strict'

const Sequelize = require('sequelize'),
      sequelize = require('../connection')

const Show = sequelize.define('show', {
  name: Sequelize.STRING,
  tmdb_id: Sequelize.INTEGER,
  start_season: Sequelize.INTEGER,
  start_episode: Sequelize.INTEGER,
  quality: Sequelize.STRING,
  eztv: Sequelize.STRING,
  use_fallback_quality: Sequelize.BOOLEAN
})

module.exports = Show