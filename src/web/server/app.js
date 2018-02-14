'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const p = require('path')
const config = require('../../config')
const winston = require('../../logger')
const dist = p.join(__dirname, '..', '..', '..', 'dist')
const routes = require('./routes')
const app = express()

app.use(cors())
app.use(bodyParser.json())

// Static files/index page
app.use(express.static(dist))
// app.get('/', (req, res) => {
//   res.sendFile(p.join(dist, 'index.html'))
// })

// Api routes
app.use('/api', routes.shows)
app.use('/api', routes.watchlist)
app.use('/api', routes.moviedb)

app.listen(config.web.port, () => {
  winston.info(`Started web server at http://localhost:${config.web.port}/`)
})
