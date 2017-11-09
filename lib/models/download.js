'use strict'

const Sequelize = require('sequelize')
const sequelize = require('../connection')

const Download = sequelize.define('download', {
  name: Sequelize.STRING,
  tmdb_id: Sequelize.INTEGER,
  season: Sequelize.INTEGER,
  episode: Sequelize.INTEGER,
  transmission_id: Sequelize.INTEGER,
  attempts: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  added: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  show_id: {
    type: Sequelize.INTEGER
  },
  completedPath: Sequelize.STRING,
  torrentFilePath: Sequelize.STRING
})

module.exports = Download
