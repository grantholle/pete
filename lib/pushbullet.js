'use strict'

const config = require('./config').pushbullet,
      PushBullet = require('pushbullet'),
      winston = require('./logger')

let pusher = false

try {
  pusher = new PushBullet(config.token)
} catch (e) { }

module.exports = {
  downloadStarted(msg) {
    if (config.token && config.notifyOnStart) {
      pusher.note({}, 'Pete says, "Download started!"', msg, (err, response) => {
        if (err)
          winston.error(`Pushbullet failed to send start notification: ${msg}`, err)
      })
    }
  },
  downloadFinished(msg) {
    if (config.token && config.notifyOnFinish) {
      pusher.note({}, 'Pete says, "Download finished!"', msg, (err, response) => {
        if (err)
          winston.error(`Pushbullet failed to send start notification: ${msg}`, err)
      })
    }
  }
}
