'use strict'

const Show = require('../models/show')
const winston = require('../logger')
const eachSeries = require('async').eachSeries
const inquirer = require('inquirer')
const prompts = require('../prompts').tvSetup
const moviedb = require('../moviedb')
const sanitize = require('sanitize-filename')

module.exports = config => {
  let watchlistShows, shows

  inquirer.prompt(prompts.continue).then(answer => {
    if (!answer.continue) {
      winston.info(`Aborting TV setup`)
      process.exit()
    }

    winston.info('Pulling TV watchlist. Please wait...')

    return moviedb.getTvWatchlist()
  }).then(res => {
    winston.info(`TV shows found in watchlist: ${res.total_results}`)

    watchlistShows = res.results

    return Show.findAll()
  }).then(currentShows => {
    shows = currentShows

    // Inquire about which shows to setup
    return inquirer.prompt([{
      type: 'checkbox',
      name: 'shows',
      message: 'Select the shows you wish to set up',
      choices: watchlistShows.map(s => {
        return { name: s.name, value: s.id }
      }),
      pageSize: watchlistShows.length
    }])
  }).then(answer => {
    return watchlistShows.filter(s => answer.shows.indexOf(s.id) !== -1)
  }).then(showsToSetUp => {
    // Go through each show one-by-one
    eachSeries(showsToSetUp, (show, callback) => {
      const setup = answer => {
        if (!answer.overwrite) {
          winston.info(`Skipping ${show.name}`)
          return callback()
        }

        let configuration

        // Ask the questions
        moviedb.tvInfo(show.id).then(showInfo => {
          show = showInfo
          return inquirer.prompt(prompts.configureShow(show))
        }).then(answers => {
          configuration = answers

          // Get the imdb id for this show
          return moviedb.getImdbId(show.id)
        }).then(result => {
          // Save or insert the show
          configuration.name = sanitize(show.name)
          configuration.tmdb_id = show.id
          configuration.imdb_id = result
          return Show.insertOrUpdate(configuration)
        }).then(result => {
          winston.info(`Configuration for ${show.name} completed`)
          callback()
        }).catch(err => {
          winston.error(err)
          callback()
        })
      }

      // If the show has an existing configuration, confirm overwrite
      if (shows.find(s => s.tmdb_id === show.id)) {
        return inquirer.prompt(prompts.confirm(show.name)).then(setup)
      }

      setup({ overwrite: true })
    }, () => {
      winston.info('TV show setup complete')
    })
  }).catch(err => winston.error(err))
}
