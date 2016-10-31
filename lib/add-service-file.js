'use strict'

const fs = require('fs'),
      p = require('path'),
      dir = p.join(__dirname, '..'),
      start = p.join(dir, 'scripts', 'start.js'),
      winston = require('./logger'),
      prompt = require('prompt'),
      colors = require('colors')

module.exports = () => {
  if (process.platform.toLowerCase() === 'linux') {
    prompt.confirm('Add daemon service script? [y/n]', (err, add) => {
      if (add) {
        fs.readFile(p.join(dir, 'pete.service'), 'utf8', (err, contents) => {
          if (err)
            return winston.error(err)

          contents = contents.replace('$dir', dir).replace('$start', start)

          fs.writeFile('/lib/systemd/system/pete.service', contents, err => {
            if (err)
              return winston.error(err)

            winston.info(`Successfully added daemon start file. Please reload daemons with '${'systemctl daemon-reload'.green}', then run '${'systemctl start pete'.green}' to start the pete daemon.`)
          })
        })
      }
    })
  }
}
