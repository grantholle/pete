'use strict'

const fs = require('fs-extra')
const inquirer = require('inquirer')
const prompts = require('../prompts').install
const winston = require('../logger')
const _ = require('lodash')
const retrieveDatabase = require('../database')

require('colors')

module.exports = config => {
  let db

  // Prompt to begin install process
  inquirer.prompt(prompts.begin).then(answer => {
    if (!answer.begin) {
      return new Promise((resolve, reject) => {
        reject(new Error('Installation aborted'))
      })
    }

    // Create pete's config directory
    return fs.mkdirs(config.directory)
  }).then(() => {
    // Retrieve the database
    return retrieveDatabase()
  }).then(database => {
    db = database
    // If we're going to update settings
    // kick off prompts
    return inquirer.prompt(prompts.configQuestions(config.existing))
  }).then(answers => {
    const oldKey = config.tmdb.apiKey

    // Merge the answers into config
    // Remove the question about which settings to modify
    delete answers.settings
    _.merge(config, answers)

    // Retrieve the api secret for tmdb of there isn't that key
    if (!_.isEmpty(config.tmdb.apiKey) && !_.isEmpty(config.tmdb.sessionId) && config.tmdb.apiKey === oldKey) {
      return config.save()
    }

    // Authenticate tmdb
    return new Promise((resolve, reject) => {
      const authenticate = () => {
        const MovieDb = require('moviedb')
        const moviedb = new MovieDb(config.tmdb.apiKey)

        moviedb.requestToken().then(token => {
          const tokenUrl = `https://www.themoviedb.org/authenticate/${token}`

          // The user has to authenticate this app before they can use the TMdb api
          winston.info(`Please visit the following URL to authorize the app, then confirm authorization to resume installation:${`\n\n    ${tokenUrl}\n`.bgGreen.black}`)

          inquirer.prompt(prompts.confirmAuth).then(answer => {
            if (!answer.appAuthorized) {
              winston.error(`Without authenticating, you cannot use Pete.`)

              return inquirer.prompt(prompts.retryAuth).then(answer => {
                if (answer.retry) {
                  return authenticate()
                }

                reject(new Error(`Could not authenticate TMdb credentials. Please reinstall Pete.`))
              })
            }

            moviedb.session().then(sessionId => {
              config.tmdb.sessionId = sessionId
              config.save()
              resolve()
            }).catch(reject)
          })
        }).catch(reject)
      }

      authenticate()
    })
  }).then(() => {
    if (db.shows.count() > 0) {
      return inquirer.prompt(prompts.cleanShows)
    }

    return { cleanShows: false }
  }).then(answer => {
    if (answer.cleanShows) {
      db.shows.removeWhere(s => s.name !== '')
    }

    db.db.saveDatabase(() => {
      winston.info('Installation complete')
    })
  }).catch(err => {
    winston.error(err)
    process.exit()
  })
}
