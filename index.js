#!/usr/bin/env node

const program = require('commander'),
      config = require('./lib/config'),
      commands = require('./lib/commands'),
      winston = require('./lib/logger')

program.version(require('./package.json').version)

// Install command
program
  .command('install')
  .alias('i')
  .description('Sets up the local filesystem, authorizes TMdb api credentials, and other misc installation requirements')
  .action(() => commands.install(config))

program
  .command('tv')
  .description('Fetches your TMdb TV watchlist and finds new episodes of your shows')
  .action(() => commands.tv(config))

program
  .command('show <tmdb_id>')
  .description('Fetches episodes for a show based on the TMdb ID')
  .option('-s, --season <season>', 'The season at which to start', null, 1)
  .option('-q, --quality <quality>', 'The desired quality you want', null, 'HDTV')
  .option('-f, --force', 'Download despite existing entries in database')
  .action((tmdb_id, options) => {
    options.season = options.season ? parseInt(options.season, 10) : 1
    options.quality = options.quality ? options.quality : 'HDTV'
    commands.show(config, tmdb_id, options)
  })

program
  .command('movies')
  .alias('m')
  .description('Fetches your TMdb movie watchlist and finds them')
  .action(() => commands.movies(config))

program
  .command('tv-setup')
  .alias('s')
  .description('Runs the configuation setup for the shows in your TV watchlist')
  .action(() => commands.tvSetup(config))

program
  .command('add-service-file')
  .alias('f')
  .description('Saves a service file to run Pete as a service on boot')
  .action(() => commands.serviceFile(config))

program.parse(process.argv)

process.on('uncaughtException', e => winston.error(e))
process.on('unhandledRejection', e => winston.error(e))
