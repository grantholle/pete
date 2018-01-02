'use strict'

const moviedb = require('../moviedb')
const winston = require('../logger')
const transmission = require('../transmission')
const p = require('path')
const moment = require('moment')
const sanitize = require('sanitize-filename')
const async = require('async')
const database = require('../database')
const searchForEpisode = require('../tv-search')
const label = require('../show-label')
const EPISODE_FAILURE_MAX = 24 // An entire day at checking once an hour -- move to config?

module.exports = async config => {
  let now = moment()
  let watchlist

  // Get TV watchlist
  winston.info('Retrieving TV show watchlist...')

  try {
    watchlist = await moviedb.accountTvWatchlist()
  } catch (err) {
    winston.error(err)
    return
  }

  if (watchlist.total_results === 0) {
    winston.info('No shows found in watchlist!')
    return
  }

  winston.info(`${watchlist.total_results} ${watchlist.total_results > 1 ? 'shows are' : 'show is'} in your watchlist.`)

  // Iterate through each show one at a time (synchronously)
  async.eachSeries(watchlist.results, (watchlistShow, watchlistCallback) => {
    // Get show info
    winston.info(`Getting show information for ${watchlistShow.name}...`)

    // Get more details about the show from TMdb
    let showInfo

    moviedb.tvInfo(watchlistShow.id).then(show => {
      showInfo = show

      // Retrieve this show from our database or create a new one
      return database.findOrCreateShow(showInfo)
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

              // Just return an empty error so it still complies with standard
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

              // Add the torrent
              const name = `${show.name} - ${label(episode.season_number, episode.episode_number)} - ${sanitize(episode.name)}`
              return transmission.addMagnet(magnet, name, directory)
            })
            .then(torrent => database.updateOrCreateEpisode(show, episode, !!torrent))
            .then(() => callback())
            .catch(err => {
              winston.error(err)
              callback()
            })
          }, hasFutureEpisode => { // Epsisode iteration is finished
            // Check if there's a next season
            const nextSeason = showInfo.seasons.find(s => s.season_number === (season + 1))

            // If there's a season after the current one,
            // change the settings and check it for episodes
            if (nextSeason && !hasFutureEpisode) {
              show.start_season++
              show.start_episode = 1
              return processSeason(nextSeason.season_number, 1)
            }

            // Reload the database to keep the torrents collection intact
            database.saveShow(show).then(watchlistCallback)
          }) // End episode iteration
        }).catch(err => {
          winston.error(`Could not get season ${season} of ${show.name}: ${err.message}`)
          watchlistCallback()
        })
      }

      // Only check the season if the next air date is set before today's date
      if (show.next_air_date && moment() < moment(show.next_air_date, 'YYYY-MM-DD')) {
        winston.info(`No episodes needed for season ${show.start_season} of ${show.name}`)
        return watchlistCallback()
      }

      // Make sure that these are numbers
      show.start_season = parseFloat(show.start_season)
      show.start_episode = parseFloat(show.start_episode)

      processSeason(show.start_season, show.start_episode)
    }).catch(err => {
      winston.error(err)
      watchlistCallback()
    })
  }, () => {
    winston.info('Finished checking TV watchlist')
  }) // end async.eachSeries - Iterating watchlist shows
}
