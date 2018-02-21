'use strict'

const transmission = require('../../../transmission')
const winston = require('../../../logger')

module.exports = {
  connection (ws, req) {
    ws.isAlive = true

    ws.on('message', data => {
      ws.isAlive = true

      try {
        const parsed = JSON.parse(data)
      } catch (err) {
        winston.error(err)
      }
    })

    ws.sendInterval = setInterval(async () => {
      const { torrents } = await transmission.get()

      try {
        ws.send(JSON.stringify(torrents))
      } catch (err) {
        winston.error(err)
      }
    }, 2000)
  }
}
