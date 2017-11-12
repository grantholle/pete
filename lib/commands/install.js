'use strict'

const fs = require('fs-extra')
const inquirer = require('inquirer')
const prompts = require('../prompts').install
const winston = require('../logger')
const tmdbAuth = require('../installation/tmdb-authenticator')
const _ = require('lodash')

require('colors')

module.exports = config => {
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
        tmdbAuth.getToken(config.tmdb.apiKey).then(token => {
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

            tmdbAuth.getSessionId(config.tmdb.apiKey, token).then(sessionId => {
              config.tmdb.sessionId = sessionId
              config.save()
              resolve()
            }).catch(err => reject(err))
          })
        }).catch(err => reject(err))
      }

      authenticate()
    })
  })
  .then(() => models.create()) // Softly create the database and tables
  .then(() => models.show.count()) // Checks to see if there are existing items in the database
  .then(count => {
    if (count > 0) {
      return inquirer.prompt(prompts.cleanShows)
    }

    return { cleanShows: false }
  }).then(answer => {
    if (answer.cleanShows) {
      return models.show.sync({ force: true })
    }
  })
  .then(() => models.download.count())
  .then(count => {
    if (count > 0) {
      return inquirer.prompt(prompts.cleanDownloads)
    }

    return { cleanDownloads: false }
  }).then(answer => {
    if (answer.cleanDownloads) {
      return models.download.sync({ force: true })
    }
  })
  .then(() => winston.info('Installation complete'))
  .catch(err => {
    winston.error(err)
    process.exit()
  })
}
