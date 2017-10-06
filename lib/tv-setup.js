'use strict'

const mediaDb = require('./media-db'),
      winston = require('./logger'),
      moviedb = require('./moviedb'),
      prompt = require('prompt'),
      eachSeries = require('async').eachSeries,
      eztv = require('./eztv'),
      inquirer = require('inquirer'),

      setupShowPromptSchema = (show, cb) => {
        winston.info(`Gathering information on ${show.name}`)

        moviedb.tvInfo({ id: show.id }, (err, res) => {
          if (err)
            return winston.error(err)

          const prompts = [
            {
              name: 'start_season',
              description: `Start ${show.name} on season (of ${res.number_of_seasons} seasons)`,
              pattern: /^\d+$/,
              message: 'Must be a number',
              default: res.number_of_seasons
            },
            {
              name: 'start_episode',
              description: `Episode`,
              pattern: /^\d+$/,
              message: 'Must be a number',
              default: 1
            },
            {
              name: 'desired_quality',
              description: 'Quality [720p or HDTV]',
              pattern: /^720p$|^hdtv$/i,
              message: 'Must be either 720p or HDTV',
              default: 'HDTV'
            }
          ]

          cb(prompts, show)
        })
      }

let shows

module.exports = () => {
  prompt.start()

  console.log('')

  prompt.confirm('Begin TV show setup? [yes/no]', (err, go) => {
    if (err || !go) {
      return winston.info('TV setup aborted')
    }

    eztv.cacheShowList(true)

    winston.info('Pulling TV watchlist. Please wait...')

    moviedb.accountTvWatchlist({ id: '{account_id}' }, (err, res) => {
      if (err) {
        return winston.error(err)
      }

      winston.info(`TV shows found in watchlist: ${res.total_results}`)

      mediaDb.getShows((err, allShows) => {
        if (err) {
          return winston.error(err)
        }

        shows = allShows

        // Inquire about which shows to setup
        inquirer.prompt([{
          type: 'checkbox',
          name: 'shows',
          message: 'Select the shows you wish to set up',
          choices: res.results.map(s => {
            return { name: s.name, value: s.id }
          })
        }]).then(answer => {
          const showsToSetUp = res.results.filter(s => answer.shows.indexOf(s.id) !== -1)

          // Go through each show synchronously
          eachSeries(showsToSetUp, (show, callback) => {
            const showId = show.id.toString(),
                  promptCb = (prompts) => {
                    let s = {
                      name: show.name,
                      id: show.id
                    }

              prompt.addProperties(s, prompts, err => {
                if (err)
                  return winston.error(err)

                eztv.searchCache(show.name).then(result => {
                  s.eztv = result

                  mediaDb.saveShow(s, (err) => {
                    if (err)
                      return winston.error(err)

                    winston.info(`Configuration for ${show.name} completed`)
                    callback(null)
                  })
                })
              })
            }

            // If the show has an existing configuration, confirm overwrite
            if (shows[showId]) {
              return prompt.confirm(`${show.name} has already been configured. Reconfigure? [y/n]`, (err, res) => {
                if (err) {
                  return winston.error(err)
                }

                if (res) {
                  return setupShowPromptSchema(show, promptCb)
                }

                winston.info(`Skipping setup for ${show.name}`)
                callback(null)
              })
            }

            // The show is brand spanking new, so let's get our configure on
            setupShowPromptSchema(show, promptCb)
          }, () => {
            winston.info('TV show setup completed!')
            mediaDb.db.close()
          })
        })
      })
    })
  })
}
