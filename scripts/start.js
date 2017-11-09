#!/usr/bin/env node
'use strict'

const minutely = 60 * 1000
const thirteenMinutes = 13 * minutely
const hourly = 60 * minutely

setInterval(() => {
  require('../lib/tv')()
}, hourly)

setInterval(() => {
  require('../lib/movies')()
}, thirteenMinutes)

setInterval(() => {
  require('../lib/clean-torrents')()
}, hourly)
