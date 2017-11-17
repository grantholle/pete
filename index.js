#!/usr/bin/env node

const program = require('commander')
const config = require('./lib/config')
const commands = require('./lib/commands')
const winston = require('./lib/logger')
const moviedb = require('./lib/moviedb')
const inquirer = require('inquirer')
const prompts = require('./lib/prompts').searchResults

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
  .command('show <tmdb_id|show_name>')
  .description('Fetches episodes for a show based on the TMdb ID or show name')
  .option('-s, --season <season>', 'The season at which to start', null, 1)
  .option('-q, --quality <quality>', 'The desired quality you want', null, 'HDTV')
  .option('-f, --force', 'Download despite existing entries in database')
  .action((tmdbId, options) => {
    options.season = options.season ? parseInt(options.season, 10) : 1
    options.quality = options.quality ? options.quality : 'HDTV'

    // If the input was a number, assume it's the tmdb id,
    // otherwise we need to search for id based on the name
    if (!isNaN(parseFloat(tmdbId))) {
      return commands.show(config, tmdbId, options)
    }

    winston.info(`Searching for ${tmdbId}...`)

    moviedb.searchTv({ query: tmdbId }).then(results => {
      if (results.total_results === 1) {
        return commands.show(config, results.results[0].id, options)
      }

      // Prompt the user to select the correct show
      inquirer.prompt(prompts.shows(results.results)).then(answer => {
        commands.show(config, answer.show, options)
      })
    }).catch(err => {
      winston.error(err)
      process.exit()
    })
  })

program
  .command('movies')
  .description('Fetches your TMdb movie watchlist and finds them')
  .action(() => commands.movies(config))

program
  .command('movie <tmdb_id|title>')
  .alias('m')
  .description('Search for a movie to start downloading based on title or TMdb ID')
  .action(tmdbId => {
    if (!isNaN(parseFloat(tmdbId))) {
      return commands.movie(config, tmdbId)
    }

    winston.info(`Searching for ${tmdbId}...`)

    moviedb.searchMovie({ query: tmdbId }).then(results => {
      if (results.total_results === 1) {
        return commands.movie(config, results.results[0].id)
      }

      inquirer.prompt(prompts.movies(results.results)).then(answer => {
        commands.movie(config, answer.movie)
      })
    })
  })

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

program
  .command('clean-torrents')
  .alias('c')
  .description('Removes torrents that have met or exceeded the configured ratio limit')
  .action(commands.clean)

program.parse(process.argv)

process.on('uncaughtException', e => winston.error(e))
process.on('unhandledRejection', e => winston.error(e))
