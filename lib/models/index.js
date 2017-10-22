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
  },
  haveExistingItems() {
    return new Promise((resolve, reject) => {
      Promise.all([this.show.count(), this.download.count()]).then((showCount, downloadCount) => {
        resolve(showCount > 0 || downloadCount > 0)
      }).catch(err => reject(err))
    })
  }
}

module.exports = models