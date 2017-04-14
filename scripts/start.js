#!/usr/bin/env node
'use strict'

const minutely = 60 * 1000,
      cleanDelay = minutely * 2,
      thirteenMinutes = 13 * minutely,
      hourly = 60 * minutely

let tvInterval = setInterval(() => {
  require('../lib/tv')()
}, hourly)

let moviesInterval = setInterval(() => {
  require('../lib/movies')()
}, thirteenMinutes)

let cleanInterval = setInterval(() => {
  require('../lib/clean-torrents')()
}, hourly)
