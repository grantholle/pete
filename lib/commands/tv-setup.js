'use strict'

const database = require('../database')
const winston = require('../logger')
const inquirer = require('inquirer')
const prompts = require('../prompts').tvSetup
const moviedb = require('../moviedb')
const sanitize = require('sanitize-filename')
const _ = require('lodash')

module.exports = async config => {
  await database.loadDatabase()
  let answer = await inquirer.prompt(prompts.continue)

  if (!answer.continue) {
    winston.info(`Aborting TV setup`)
    return
  }

  winston.info('Pulling TV watchlist. Please wait...')
  let res

  try {
    res = await moviedb.accountTvWatchlist()
  } catch (err) {
    winston.error(err)
    return
  }

  winston.info(`TV shows found in watchlist: ${res.total_results}`)

  const watchlistShows = res.results

  // Inquire about which shows to setup
  answer = await inquirer.prompt([{
    type: 'checkbox',
    name: 'shows',
    message: 'Select the shows you wish to set up',
    choices: _.sortBy(watchlistShows, ['name']).map(s => {
      return { name: s.name, value: s.id }
    }),
    pageSize: watchlistShows.length
  }])

  const showsToSetUp = await watchlistShows.filter(s => answer.shows.indexOf(s.id) !== -1)

  // Go through each show one-by-one
  for (const show of showsToSetUp) {
    const setup = async answer => {
      if (!answer.overwrite) {
        winston.info(`Skipping ${show.name}`)
        return
      }

      let showInfo
      let configuration

      try {
        // Ask the questions
        showInfo = await moviedb.tvInfo(show.id)

        configuration = await inquirer.prompt(prompts.configureShow(showInfo))

        // Save or insert the show
        configuration.name = sanitize(showInfo.name)
        configuration.tmdb_id = show.id

        // Get the imdb id for this show
        configuration.imdb_id = await moviedb.getImdbId(show.id)
      } catch (err) {
        return winston.error(err)
      }

      const currentShow = await database.findOrCreateShow(showInfo)
      await database.saveShow(_.assign(currentShow, configuration))
      winston.info(`Configuration for ${show.name} completed`)
    }

    let answer = { overwrite: true }

    // If the show has an existing configuration, confirm overwrite
    if (database.media.findOne({ tmdb_id: show.id })) {
      answer = await inquirer.prompt(prompts.confirm(show.name))
    }

    await setup(answer)
  }

  winston.info('TV show setup complete')
}
