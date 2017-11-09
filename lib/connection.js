'use strict'

const config = require('./config')
const p = require('path')
const Sequelize = require('sequelize')
const winston = require('./logger').loggers.get('queries')

const sequelize = new Sequelize('pete', '', '', {
  dialect: 'sqlite',
  storage: p.join(config.directory, 'pete.database'),
  operatorsAliases: Sequelize.Op,
  logging (msg) {
    winston.info(msg)
  }
})

module.exports = sequelize
