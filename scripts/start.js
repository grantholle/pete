#!/usr/bin/env node
'use strict'

const minutely = 60 * 1000
const thirteenMinutes = 13 * minutely
const hourly = 60 * minutely
const config = require('../lib/config')

setInterval(() => {
  require('../lib/commands/tv')(config)
}, hourly)

setInterval(() => {
  require('../lib/commands/movies')(config)
}, thirteenMinutes)
