'use strict'

const express = require('express')
const WebSocket = require('ws')
const bodyParser = require('body-parser')
const cors = require('cors')
const p = require('path')
const config = require('../../config')
const winston = require('../../logger')
const dist = p.join(__dirname, '..', '..', '..', 'dist')
const routes = require('./routes')
const app = express()
const server = require('http').createServer(app)
const wss = new WebSocket.Server({ server })
const transmissionController = require('./controllers/transmission')

app.use(cors())
app.use(bodyParser.json())

// Static files/index page
app.use(express.static(dist))
// app.get('/', (req, res) => {
//   res.sendFile(p.join(dist, 'index.html'))
// })

app.use((err, req, res, next) => {
  winston.error(err)

  res.status(500).json({
    message: err.message
  })
})

// Api routes
app.use('/api', routes.shows)
app.use('/api', routes.watchlist)
app.use('/api', routes.moviedb)

try {
  wss.on('connection', transmissionController.connection)

  // Checks for connections and disconnects them if the aren't alive
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        clearInterval(ws.sendInterval)
        return ws.terminate()
      }

      ws.isAlive = false
    })
  }, 30000)
} catch (err) {
  console.log(err)
}

server.listen(config.web.port, () => {
  winston.info(`Started web server at http://localhost:${server.address().port}/`)
})
