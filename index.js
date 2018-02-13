#!/usr/bin/env node

const program = require('commander')
const config = require('./src/config')
const commands = require('./src/commands')
const winston = require('./src/logger')
const moviedb = require('./src/moviedb')
const inquirer = require('inquirer')
const prompts = require('./src/prompts').searchResults

program.version(require('./package.json').version)

program
  .command('install')
  .alias('i')
  .description('Sets up the local filesystem, authorizes TMdb api credentials, and other misc installation requirements')
  .action(() => commands.install(config))

program
  .command('tv')
  .option('-c, --choose', 'Only check a selection of shows from your watchlist')
  .description('Fetches your TMdb TV watchlist and finds new episodes of your shows')
  .action(async options => {
    // Get TV watchlist
    winston.info('Retrieving TV show watchlist...')

    let watchlist

    try {
      watchlist = await moviedb.accountTvWatchlist()
    } catch (err) {
      winston.error(err)
      return process.exit()
    }

    if (watchlist.results.length === 0) {
      winston.info('No shows found in watchlist!')
      return process.exit()
    }

    winston.info(`${watchlist.total_results} ${watchlist.total_results > 1 ? 'shows are' : 'show is'} in your watchlist.`)

    // Select the shows to check
    if (options.choose) {
      const answer = await inquirer.prompt(prompts.watchlistShows(watchlist.results))
      watchlist.results = watchlist.results.filter(s => answer.shows.indexOf(s.id) !== -1)
    }

    commands.tv(config, watchlist)
  })

program
  .command('show [tmdb_id|show_name]')
  .description('Fetches episodes for a show based on the TMdb ID or show name. If no show is provided, choose from your watchlist.')
  .option('-s, --season <season>', 'The season at which to start', null, 1)
  .option('-e, --episode <episode>', 'The episode at which to start', null, 1)
  .option('-q, --quality <quality>', 'The desired quality you want', null, 'HDTV')
  .option('-f, --force', 'Download despite existing entries in database')
  .option('-o, --one', 'Download only the specified season and episode of the show')
  .action(async (tmdbId, options) => {
    // If no show was chosen to search,
    if (!tmdbId) {
      // Get the watchlist and choose the show from the list
      try {
        const watchlist = await moviedb.accountTvWatchlist()
        const answer = await inquirer.prompt(prompts.shows(watchlist.results))

        return commands.show(config, answer.show, options)
      } catch (err) {
        winston.error(err)
        process.exit()
      }
    }

    options.season = options.season ? parseFloat(options.season) : 1
    options.episode = options.episode ? parseFloat(options.episode) : 1
    options.quality = options.quality ? options.quality : 'HDTV'

    // If the input was a number, assume it's the tmdb id,
    // otherwise we need to search for id based on the name
    if (!isNaN(parseFloat(tmdbId))) {
      return commands.show(config, tmdbId, options)
    }

    winston.info(`Searching for ${tmdbId}...`)

    let results

    try {
      results = await moviedb.searchTv({ query: tmdbId })
    } catch (err) {
      winston.error(err)
      process.exit()
    }

    if (results.total_results === 1) {
      return commands.show(config, results.results[0].id, options)
    }

    // Prompt the user to select the correct show
    try {
      const answer = await inquirer.prompt(prompts.shows(results.results))
      commands.show(config, answer.show, options)
    } catch (err) {
      winston.error(err)
      process.exit()
    }
  })

program
  .command('movies')
  .description('Download the movies in your TMdb movie watchlist')
  .action(() => commands.movies(config))

program
  .command('movie <tmdb_id|title>')
  .alias('m')
  .description('Search for a movie to start downloading based on title or TMdb ID')
  .action(async tmdbId => {
    if (!isNaN(parseFloat(tmdbId))) {
      return commands.movie(config, tmdbId)
    }

    winston.info(`Searching for ${tmdbId}...`)

    const results = await moviedb.searchMovie({ query: tmdbId })

    if (results.total_results === 1) {
      return commands.movie(config, results.results[0].id)
    }

    const answer = await inquirer.prompt(prompts.movies(results.results))
    commands.movie(config, answer.movie)
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
  .option('-c, --cache', 'Removes all saved torrents in the database')
  .description('Removes torrents that have met or exceeded the configured ratio limit')
  .action(commands.clean)

program.parse(process.argv)

process.on('uncaughtException', e => winston.error(e))
process.on('unhandledRejection', e => winston.error(e))
