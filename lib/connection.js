'use strict'

const config = require('./config'),
      p = require('path'),
      Sequelize = require('sequelize')

const sequelize = new Sequelize('pete', '', '', {
  dialect: 'sqlite',
  storage: p.join(config.dir.home, 'pete.database')
})

module.exports = sequelize