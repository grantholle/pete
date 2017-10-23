#!/usr/bin/env node

const program = require('commander'),
      config = require('./lib/config'),
      commands = require('./lib/commands')

program.version(require('./package.json').version)

// Install command
program
  .command('install')
  .alias('i')
  .description('Sets up the local filesystem, authorizes TMdb api credentials, and other misc installation requirements')
  .action(() => {
    commands.install(config)
  })

program
  .command('tv')
  .description('Fetches your TMdb TV watchlist and finds new episodes of your shows')
  .action(() => {
    // require(`./lib/tv`)()
  })

program
  .command('movies')
  .alias('m')
  .description('Fetches your TMdb movie watchlist and finds them')
  .action(() => {
    // require(`./lib/movies`)()
  })

program
  .command('tv-setup')
  .alias('s')
  .description('Runs the configuation setup for the shows in your TV watchlist')
  .action(() => {
    // require(`./lib/tv-setup`)()
  })

program
  .command('add-service-file')
  .alias('f')
  .description('Saves a service file to run Pete as a service on boot')
  .action(() => {
    // require(`./lib/add-service-file`)()
  })


program.parse(process.argv)
