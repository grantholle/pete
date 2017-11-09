#!/usr/bin/env node
'use strict'

const minutely = 60 * 1000
const thirteenMinutes = 13 * minutely
const hourly = 60 * minutely

let tvInterval = setInterval(() => {
  require('../lib/tv')()
}, hourly)

let moviesInterval = setInterval(() => {
  require('../lib/movies')()
}, thirteenMinutes)

let cleanInterval = setInterval(() => {
  require('../lib/clean-torrents')()
}, hourly)
