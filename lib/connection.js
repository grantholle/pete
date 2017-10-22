'use strict'

const config = require('./config'),
      p = require('path'),
      Sequelize = require('sequelize'),
      winston = require('./logger').loggers.get('queries')

winston.cli()

const sequelize = new Sequelize('pete', '', '', {
  dialect: 'sqlite',
  storage: p.join(config.directory, 'pete.database'),
  operatorsAliases: Sequelize.Op,
  logging(msg) {
    winston.info(msg)
  }
})

module.exports = sequelize