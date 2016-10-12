'use strict'

const config = require('./config'),
      PushBullet = require('pushbullet'),
      pusher = new PushBullet(config.pushbullet.token),
      winston = require('./logger')

module.exports = (title, msg) => {
  pusher.note({}, title, msg, (err, response) => {
    if (err)
      winston.error(err)
  })
}
