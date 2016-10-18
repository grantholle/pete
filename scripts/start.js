#!/usr/bin/env node
'use strict'

const tv = require('../lib/tv'),
      movies = require('../lib/movies'),
      minutely = 60 * 1000,
      hourly = 60 * minutely

let tvInterval = setInterval(tv, hourly)
let moviesInterval = setInterval(movies, minutely)
