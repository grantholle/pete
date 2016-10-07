'use strict'

const config = require('./lib/config'),
      transmission = require('./lib/transmission')(config.transmission)

transmission.get([17, 18], (err, res) => {
  res.torrents.forEach(item => {
    console.log(item.downloadDir)
  })
})
