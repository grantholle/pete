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

module.exports = async (config, tmdbId, options) => {
  let showInfo
  let storedShow

  winston.info(`Looking up ID ${tmdbId}...`)

  // Get show information
  try {
    showInfo = await moviedb.tvInfo(tmdbId)
    storedShow = await database.findOrCreateShow(showInfo)
  } catch (err) {
    winston.error(err)
    return
  }

  // Set the quality
  // Force it if it's set, if the show exists set it to that quality, otherwise HDTV
  showInfo.quality = options.quality ? options.quality : storedShow ? storedShow.quality : 'HDTV'
  return console.log(showInfo.quality)
  winston.info(`Getting show information for ${showInfo.name}...`)

  // Only pull seasons that are greater than or equal to the season option
  const seasons = showInfo.seasons.filter(s => s.season_number >= options.season)

  // Iterate those seasons to get the episodes
  async.eachSeries(seasons, (season, seasonCallback) => {
    winston.info(`Checking season ${season.season_number} of ${showInfo.name}`)

    // Get season information
    moviedb.tvSeasonInfo({ id: showInfo.id, season_number: season.season_number }).then(seasonData => {
      // Iterate each episode to search for it
      async.eachSeries(seasonData.episodes, (episode, episodeCallback) => {
        // Make sure it's an episode that's greater than the one we want
        if (episode.episode_number < options.episode) {
          return episodeCallback()
        }

        // Check if there's any existing episodes that we've attempted
        const existingIndex = storedShow.episodes.findIndex(d => d.season === episode.season_number &&
          d.episode === episode.episode_number)

        // If there is an existing download and we're not forcing
        // Or the episode hasn't aired continue the episode iteration
        if ((existingIndex !== -1 && storedShow.episodes[existingIndex].added && !options.force) || moment() < moment(episode.air_date, 'YYYY-MM-DD')) {
          return episodeCallback(options.one)
        }

        winston.info(`Searching for season ${episode.season_number} episode ${episode.episode_number} of ${showInfo.name}`)
        let directory = p.join(config.locations.tv, showInfo.name, `Season ${episode.season_number}`)

        searchForEpisode(storedShow, episode, storedShow.use_alternate_quality).then(magnet => {
          winston.info(`Episode${magnet ? ' ' : ' not '}found for season ${episode.season_number} episode ${episode.episode_number} of ${showInfo.name}`)

          // Don't add anything if a magnet wasn't found
          if (!magnet) {
            return false
          }

          // Add the torrent
          const name = `${showInfo.name} - ${label(episode.season_number, episode.episode_number)} - ${sanitize(episode.name)}`
          return transmission.addMagnet(magnet, name, directory)
        }).then(torrent => {
          return database.updateOrCreateEpisode(storedShow, episode, !!torrent)
        }).then(() => {
          episodeCallback(options.one)
        }).catch(err => {
          if (err) {
            winston.error(err)
          }

          episodeCallback(options.one)
        })
      }, () => {
        winston.info(`Finished checking season ${season.season_number} of ${showInfo.name}`)
        seasonCallback(options.one)
      })
    })
  }, () => {
    winston.info(`Finished searching for episodes of ${showInfo.name}`)
  })
}
