'use strict'

const config = require('./config').pushbullet,
      PushBullet = require('pushbullet'),
      winston = require('./logger'),
      notify = (msg, send) => {
        return new Promise((resolve, reject) => {
          if (!pusher || !send) {
            return resolve()
          }

          pusher.note({}, 'Hornberger!', msg, (err, response) => {
            if (err) {
              winston.error(`Pushbullet failed to send message: ${msg}`, err)
            }

            resolve()
          })
        })
      }

let pusher = false

try {
  pusher = new PushBullet(config.token)
} catch (e) { }

module.exports = {
  started(msg) {
    return notify(msg, config.notifyOnStart)
  },
  finished(msg) {
    return notify(msg, config.notifyOnFinish)
  }
}
