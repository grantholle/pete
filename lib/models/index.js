'use strict'

const show = require('./show'),
  download = require('./download')

// Define a relationship
show.hasMany(download, { as: 'episodes', foreignKey: 'show_id', sourceKey: 'id' })
download.belongsTo(show, { as: 'show', foreignKey: 'show_id', targetKey: 'id' })

const models = {
  show,
  download,
  create (force = false) {
    return Promise.all([show.sync({ force }), download.sync({ force })])
  },
  remove () {
    this.create(true)
  }
}

module.exports = models
