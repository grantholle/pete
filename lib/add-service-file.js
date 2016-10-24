'use strict'

const fs = require('fs'),
      p = require('path'),
      dir = p.join(__dirname, '..'),
      start = p.join(dir, 'scripts', 'start.js'),
      colors = require('colors')

module.exports = (cb) => {
  fs.readFile(p.join(dir, 'pete.service'), 'utf8', (err, contents) => {
    if (err)
      return process.nextTick(cb, err)

    contents = contents.replace('$dir', dir).replace('$start', start)

    fs.writeFile('/etc/systemd/system/pete.service', contents, err => {
      if (err)
        return process.nextTick(cb, err)


      if (cb)
        process.nextTick(cb, null, `Successfully added daemon start file. Please reload daemons with '${'systemctl daemon-reload'.green}', then run '${'systemctl start pete'.green}' to start the pete daemon.`)
    })
  })
}
