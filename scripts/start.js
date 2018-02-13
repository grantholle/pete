#!/usr/bin/env node
'use strict'

const minutely = 60 * 1000
const thirteenMinutes = 13 * minutely
const hourly = 60 * minutely
const config = require('../src/config')

setInterval(() => {
  require('../src/commands/tv')(config)
}, hourly)

setInterval(() => {
  require('../src/commands/movies')(config)
}, thirteenMinutes)
