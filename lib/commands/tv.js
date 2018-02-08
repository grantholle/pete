'use strict'

const moviedb = require('../moviedb')
const winston = require('../logger')
const transmission = require('../transmission')
const p = require('path')
const moment = require('moment')
const sanitize = require('sanitize-filename')
const database = require('../database')
const searchForEpisode = require('../tv-search')
const label = require('../show-label')
const EPISODE_FAILURE_MAX = 24 // An entire day at checking once an hour -- move to config?

module.exports = async (config, watchlist) => {
  let now = moment()

  // Iterate through each show one at a time
  for (const watchlistShow of watchlist.results) {
    // Get show info
    winston.info(`Getting show information for ${watchlistShow.name}...`)

    // Get more details about the show from TMdb
    let showInfo

    try {
      showInfo = await moviedb.tvInfo(watchlistShow.id)
    } catch (err) {
      winston.error(err)
      continue
    }

    // Retrieve this show from our database or create a new one
    const show = await database.findOrCreateShow(showInfo)

    // Process a season's episodes
    const processSeason = async (season, startEpisode) => {
      winston.info(`Checking season ${season} of ${show.name}`)
      let res

      try {
        // Get the season information for the season we currently want
        res = await moviedb.tvSeasonInfo({ id: show.tmdb_id, season_number: season })
      } catch (err) {
        winston.error(`Could not get season ${season} of ${show.name}: ${err.message}`)
        return
      }

      // Only get episodes that are greater than the starting episde
      // and we don't have an unadded episode that is released
      // and the attempts is less than the max allowed
      // Sort to take advantage of ending the iteration early
      let episodes = res.episodes.filter(e => {
        return e.episode_number >= startEpisode &&
          !show.episodes.some(se => {
            return (se.episode === e.episode_number &&
              se.season === e.season_number &&
              se.added) ||
              (!se.added && se.attempts > EPISODE_FAILURE_MAX)
          })
      }).sort((a, b) => a.episode_number - b.episode_number)

      // If no episodes are needed for this season
      if (!episodes || episodes.length === 0) {
        winston.info(`No episodes needed for season ${season} of ${show.name}`)
        episodes = []
      }

      let hasFutureEpisode = false

      for (const episode of episodes) {
        // If it hasn't aired yet, just break from whatever is possibly left
        if (!episode.air_date || now < moment(episode.air_date, 'YYYY-MM-DD')) {
          // show.next_air_date = episode.air_date
          // show.start_episode = episode.episode_number
          hasFutureEpisode = true
          break
        }

        winston.info(`Searching for season ${episode.season_number} episode ${episode.episode_number} of ${show.name}`)

        let directory = p.join(config.locations.tv, show.name, `Season ${episode.season_number}`)

        try {
          const magnet = await searchForEpisode(show, episode, show.use_alternate_quality)

          winston.info(`Episode${magnet ? ' ' : ' not '}found for season ${episode.season_number} episode ${episode.episode_number} of ${show.name}`)

          // Don't add anything if a magnet wasn't found
          if (!magnet) {
            continue
          }

          // Add the torrent
          const name = `${show.name} - ${label(episode.season_number, episode.episode_number)} - ${sanitize(episode.name)}`
          const torrent = await transmission.addMagnet(magnet, name, directory)
          await database.updateOrCreateEpisode(show, episode, !!torrent)
        } catch (err) {
          winston.error(err)
        }
      }

      // Check if there's a next season
      const nextSeason = showInfo.seasons.find(s => s.season_number === (season + 1))

      // If there's a season after the current one,
      // change the settings and check it for episodes
      if (nextSeason && !hasFutureEpisode) {
        show.start_season = nextSeason.season_number
        show.start_episode = 1
        await processSeason(show.start_season, show.start_episode)
        return
      }

      // Reload the database to keep the torrents collection intact
      await database.saveShow(show)
    }

    // Only check the season if the next air date is set before today's date
    // if (show.next_air_date && moment() < moment(show.next_air_date, 'YYYY-MM-DD')) {
    //   winston.info(`No episodes needed for season ${show.start_season} of ${show.name}`)
    //   return watchlistCallback()
    // }

    // Make sure that these are numbers
    show.start_season = parseFloat(show.start_season)
    show.start_episode = parseFloat(show.start_episode)

    await processSeason(show.start_season, show.start_episode)
  }

  winston.info('Finished checking TV watchlist')
}
