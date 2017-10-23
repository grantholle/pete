'use strict'

const fs = require('fs-extra'),
      config = require('./config'),
      inquirer = require('inquirer'),
      prompts = require('./prompts').install,
      winston = require('./logger'),
      tmdbAuth = require('./installation/tmdb-authenticator'),
      colors = require('colors'),
      _ = require('lodash'),
      models = require('./models'),
      eztv = require('./eztv')

module.exports = () => {

  // Prompt to begin install process
  inquirer.prompt(prompts.begin).then(answer => {
    if (!answer.begin) {
      return new Promise((resolve, reject) => {
        reject('Installation aborted')
      })
    }

    // Create pete's config directory
    return fs.mkdirs(config.directory)
  }).then(() => {
    // If the config existed prompt to run config prompts
    if (config.existing) {
      return inquirer.prompt(prompts.changeCurrentSettings)
    }

    // Force the update if there is no existing configuration
    return { changeSettings: true }
  }).then(answer => {
    // If we're going to update settings
    // kick off prompts
    if (answer.changeSettings) {
      return inquirer.prompt(prompts.configQuestions)
    }

    // Settings not updated
    return {}
  }).then(answers => {
    const oldKey = config.tmdb.apiKey

    // Merge the answers into config
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

                reject(`Could not authenticate TMdb credentials. Please reinstall Pete.`)
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

    return
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

    return
  })
  .then(() => winston.info('Installation complete'))
  .catch(err => winston.error(err))
}
