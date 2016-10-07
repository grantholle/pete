'use strict'

const config = require('./config'),
      showsConfig = require('./config-shows'),
      shows = showsConfig.shows,
      winston = require('./logger'),
      moviedb = require('moviedb')(config.tmdb.apiKey),
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
              name: 'season',
              description: `Start ${show.name} on season (of ${res.number_of_seasons} seasons)`,
              pattern: /^\d+$/,
              message: 'Must be a number',
              default: res.number_of_seasons
            },
            {
              name: 'episode',
              description: `Episode`,
              pattern: /^\d+$/,
              message: 'Must be a number',
              default: 1
            },
            {
              name: 'quality',
              description: 'Quality [720p or HDTV]',
              pattern: /^720p$|^hdtv$/i,
              message: 'Must be either 720p or HDTV',
              default: 'HDTV'
            }
          ]

          cb(prompts)
        })
      },

      saveShows = () => {
        showsConfig.save(() => {
          winston.info('Your TV shows config file has been saved!')
        })
      }

moviedb.session_id = config.tmdb.sessionId
eztv.cacheShowList()

prompt.start()
prompt.confirm('Begin TV show setup? [yes/no]', (err, go) => {
  if (err || !go)
    return winston.info('TV setup aborted!')

  winston.info('Pulling TV watchlist. Please wait...')

  moviedb.accountTvWatchlist({ id: '{account_id}' }, (err, res) => {
    if (err)
      return winston.error(err)

    winston.info(`TV shows found in watchlist: ${res.total_results}`)

    const iteratee = (show, callback) => {
      const showId = show.id.toString(),
            promptCb = (prompts) => {
              shows[showId] = {
                name: show.name,
                downloaded: {}
              }

              prompt.addProperties(shows[showId], prompts, err => {
                if (err)
                  throw err

                eztv.searchCache(show.name).then(result => {
                  shows[showId].eztv = result
                  shows[showId].downloaded[shows[showId].season] = []
                  winston.info(`Configuration for ${show.name} completed`)
                  callback(null)
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
    }

    // Go through each show synchronously
    eachSeries(res.results, iteratee, saveShows)
  })
})
