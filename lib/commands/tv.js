'use strict'

const moviedb = require('../moviedb')
const winston = require('../logger')
const transmission = require('../transmission')
const notify = require('../pushbullet').started
const p = require('path')
const moment = require('moment')
const sanitize = require('sanitize-filename')
const async = require('async')
const db = require('../database')
const searchForEpisode = require('../tv-search')
const label = require('../show-label')
const EPISODE_FAILURE_MAX = 24 // An entire day at checking once an hour -- move to config?

module.exports = config => {
  let now = moment()
  let watchlist

  // Get TV watchlist
  winston.info('Retrieving TV show watchlist...')

  moviedb.accountTvWatchlist().then(results => {
    watchlist = results

    if (watchlist.total_results === 0) {
      winston.info('No shows found in watchlist!')
      process.exit()
    }

    winston.info(`${watchlist.total_results} ${watchlist.total_results > 1 ? 'shows are' : 'show is'} in your watchlist.`)

    // Initialize the database
    return db()
  }).then(({ shows, db }) => {
    // Iterate through each show one at a time (synchronously)
    async.eachSeries(watchlist.results, (watchlistShow, watchlistCallback) => {
      // Get show info
      winston.info(`Getting show information for ${watchlistShow.name}...`)

      // Get more details about the show from TMdb
      let showInfo

      moviedb.tvInfo(watchlistShow.id).then(show => {
        showInfo = show

        // Try to retrieve this show from our database
        return shows.findOne({ tmdb_id: show.id })
      }).then(existingShow => {
        // If we have an existing configuration
        // Return continue with the current configuration
        if (!existingShow) {
          // If we don't have any settings for this show, let's create a default one
          winston.info(`No configuration exists for ${showInfo.name}. Creating default configuration now.`)

          // Sort desc then grab the first one that doesn't have an air_date
          // that's past today's date
          const startSeason = showInfo.seasons
            .sort((a, b) => b.seaon_number - a.seaon_number)
            .find(s => moment(s.air_date, 'YYYY-MM-DD') < now && s.season_number > 0)

          return shows.insert({
            name: sanitize(showInfo.name),
            tmdb_id: showInfo.id,
            start_season: startSeason ? startSeason.season_number : 1,
            start_episode: 1,
            episodes: [],
            quality: 'HDTV',
            use_alternate_quality: true
          })
        }

        return existingShow
      }).then(show => {
        if (show.imdb_id) {
          return show
        }

        return new Promise(resolve => {
          moviedb.getImdbId(show.tmdb_id).then(imdbId => {
            show.imdb_id = imdbId
            resolve(show)
          })
        })
      }).then(show => {
        // Process a season's episodes
        const processSeason = (season, startEpisode) => {
          winston.info(`Checking season ${season} of ${show.name}`)

          // Get the season information for the season we currently want
          moviedb.tvSeasonInfo({ id: show.tmdb_id, season_number: season }).then(res => {
            // Only get episodes that are greater than the starting episde
            // and we don't have an unadded episode that is released
            // and the attempts is less than the max allowed
            let episodes = res.episodes.filter(e => e.episode_number >= startEpisode &&
              !show.episodes.some(se => se.episode === e.episode_number && (se.added || (!se.added && se.attempts > EPISODE_FAILURE_MAX))))

            // If no episodes are needed for this season
            if (!episodes || episodes.length === 0) {
              winston.info(`No episodes needed for season ${season} of ${show.name}`)
              episodes = []
            }

            // Iterate through the episodes
            // Sort to take advantage of ending the iteration early
            async.eachSeries(episodes.sort((a, b) => a.episode_number - b.episode_number), (episode, callback) => {
              // If the air date is in the future, don't process this episode
              // End the iteration because we've started episodes that haven't aired
              if (!episode.air_date || now < moment(episode.air_date, 'YYYY-MM-DD')) {
                show.next_air_date = episode.air_date
                show.start_episode = episode.episode_number
                return callback(new Error())
              }

              winston.info(`Searching for season ${episode.season_number} episode ${episode.episode_number} of ${show.name}`)

              let directory = p.join(config.locations.tv, show.name, `Season ${episode.season_number}`)

              searchForEpisode(show, episode, show.use_alternate_quality).then(magnet => {
                winston.info(`Episode${magnet ? ' ' : ' not '}found for season ${episode.season_number} episode ${episode.episode_number} of ${show.name}`)

                // Don't add anything if a magnet wasn't found
                if (!magnet) {
                  return false
                }

                const name = `${show.name} - ${label(episode.season_number, episode.episode_number)} - ${sanitize(episode.name)}`

                // Add the torrent
                winston.info('Adding to Transmission...')
                return transmission.addEpisode(magnet, directory, name)
              }).then(torrent => {
                if (torrent) {
                  const message = `Started download for season ${episode.season_number} episode ${episode.episode_number} of ${show.name}`
                  notify(message)
                  winston.info(message)
                }

                // If there's an existing entry for this episode
                // increment the attempt count
                // Set an existing episode entry
                const existingIndex = show.episodes.findIndex(e => e.season === episode.season_number && e.episode === episode.episode_number)

                if (existingIndex !== -1) {
                  show.episodes[existingIndex].attempts++
                  show.episodes[existingIndex].added = !!torrent
                  db.saveDatabase()
                  return callback()
                }

                // Create the download object if there wasn't an existing episode
                show.episodes.push({
                  name: sanitize(episode.name),
                  season: episode.season_number,
                  episode: episode.episode_number,
                  transmission_id: torrent ? torrent.id : null,
                  added: !!torrent,
                  completedPath: torrent ? p.join(directory, torrent.name) : directory
                })

                db.saveDatabase()
                callback()
              }).catch(err => {
                winston.error(err)
                callback()
              })
            }, () => {
              // Check if there's a next season
              const nextSeason = showInfo.seasons.find(s => s.season_number === season + 1)

              // If there's a season after the current one,
              // change the settings and check it for episodes
              if (nextSeason) {
                show.start_season++
                show.start_episode = 1
                return processSeason(nextSeason.season_number, 1)
              }

              shows.update(show)
              db.saveDatabase(err => {
                if (err) {
                  winston.error('Error saving database', err)
                }

                watchlistCallback()
              })
            }) // End episode iteration
          }).catch(err => {
            winston.error(`Could not get season ${season} of ${show.name}`, err.message)
            watchlistCallback()
          })
        }

        // Only check the season if the next air date is set before today's date
        if (show.next_air_date && moment() < moment(show.next_air_date, 'YYYY-MM-DD')) {
          winston.info(`No episodes needed for season ${show.start_season} of ${show.name}`)
          return watchlistCallback()
        }

        processSeason(show.start_season, show.start_episode)
      }).catch(err => {
        winston.error(err)
        watchlistCallback()
      })
    }, () => {
      winston.info('Finished checking TV watchlist')
    }) // end async.eachSeries - Iterating watchlist shows
  })
}
