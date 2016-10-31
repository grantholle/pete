#!/usr/bin/env node
'use strict'

const tv = require('../lib/tv'),
      movies = require('../lib/movies'),
      minutely = 60 * 1000,
      tenMinutes = 10 * minutely,
      hourly = 60 * minutely

let tvInterval = setInterval(tv, hourly)
let moviesInterval = setInterval(movies, tenMinutes)
