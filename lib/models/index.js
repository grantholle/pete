'use strict'

const show = require('./show'),
      download = require('./download')

const models = {
  show,
  download,
  create(force = false) {
    return Promise.all([show.sync({ force }), download.sync({ force })])
  },
  remove() {
    this.create(true)
  }
}

module.exports = models