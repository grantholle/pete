#!/usr/bin/env node

const commands = ['tv', 'movies', 'tv-setup']
      args = process.argv.slice(2),
      colors = require('colors')

if (args[0] && commands.indexOf(args[0]) !== -1) {
  require(`./lib/${args[0]}`)()
} else if (args[0].toLowerCase() === 'help') {
  console.log(`Available commands are: ${'tv'.green}, ${'movies'.green}, ${'tv-setup'.green}`)
} else {
  console.log(`Command '${args[0].red}' not found. Available commands are: ${'tv'.green}, ${'movies'.green}, ${'tv-setup'.green}`)
}
