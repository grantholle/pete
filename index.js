#!/usr/bin/env node

const commands = ['tv', 'movies']
      args = process.argv.slice(2)

if (args[0] && commands.indexOf(args[0]) !== -1) {
  require(`./lib/${args[0]}`)()
} else {
  require('./lib/tv-setup')()
}
