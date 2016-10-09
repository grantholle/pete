'use strict'

const showsDb = require('./shows-db'),
      winston = require('./logger'),
      moviedb = require('./moviedb'),
      prompt = require('prompt'),
      eachSeries = require('async').eachSeries,
      eztv = require('./eztv'),

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

eztv.cacheShowList()
let shows

prompt.start()
prompt.confirm('Begin TV show setup? [yes/no]', (err, go) => {
  if (err || !go)
    return winston.info('TV setup aborted!')

  winston.info('Pulling TV watchlist. Please wait...')

  moviedb.accountTvWatchlist({ id: '{account_id}' }, (err, res) => {
    if (err)
      return winston.error(err)

    winston.info(`TV shows found in watchlist: ${res.total_results}`)

    showsDb.getShows((err, allShows) => {
      if (err)
        return winston.error(err)

      shows = allShows

      // Go through each show synchronously
      eachSeries(res.results, (show, callback) => {
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
                    s.eztv = JSON.stringify(result)

                    showsDb.saveShow(s, (err) => {
                      if (err)
                        return winston.error(err)

                      winston.info(`Configuration for ${show.name} completed`)
                      callback(null)
                    })
                  })
                })
              }

        if (shows[showId]) {
          prompt.confirm(`${show.name} has already been configured. Reconfigure? [yes/no]`, (err, res) => {
            if (err)
              return winston.error(err)

            if (res) {
              setupShowPromptSchema(show, promptCb)
            } else {
              winston.info(`Skipping setup for ${show.name}`)
              callback(null)
            }
          })
        } else {
          setupShowPromptSchema(show, promptCb)
        }
      }, () => {
        winston.info('TV show setup completed!')
        showsDb.db.close()
      })
    })
  })
})
