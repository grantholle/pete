'use strict'

const moviedb = require('../moviedb')
const winston = require('../logger')
const transmission = require('../transmission')
const notify = require('../pushbullet').started
const p = require('path')
const moment = require('moment')
const sanitize = require('sanitize-filename')
const async = require('async')
const retrieveDatabase = require('../database')
const searchForEpisode = require('../tv-search')
const label = require('../show-label')

module.exports = (config, tmdbId, options) => {
  let showInfo
  let db
  let storedShow

  winston.info(`Looking up ID ${tmdbId}...`)

  // Get show information
  moviedb.tvInfo(tmdbId).then(show => {
    showInfo = show
    showInfo.quality = options.quality ? options.quality : 'HDTV'
    winston.info(`Getting show information for ${show.name}...`)
  })
  .then(() => retrieveDatabase())
  .then(database => {
    db = database

    storedShow = db.shows.findOne({ tmdb_id: showInfo.id })

    if (!storedShow) {
      // Fetch the show's imdb id
      return moviedb.getImdbId(showInfo.id)
    }

    return storedShow.imdb_id
  }).then(imdbId => {
    // Set the underlying show object
    showInfo.imdb_id = imdbId

    if (!storedShow) {
      storedShow = db.shows.insert({
        name: sanitize(showInfo.name),
        tmdb_id: showInfo.id,
        imdb_id: imdbId,
        start_season: options.season,
        start_episode: 1,
        use_alternate_quality: true,
        episodes: []
      })
    }
  }).then(() => {
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

          searchForEpisode(showInfo, episode, storedShow.use_alternate_quality).then(magnet => {
            winston.info(`Episode${magnet ? ' ' : ' not '}found for season ${episode.season_number} episode ${episode.episode_number} of ${showInfo.name}`)

            // Don't add anything if a magnet wasn't found
            if (!magnet) {
              return false
            }

            const name = `${showInfo.name} - ${label(episode.season_number, episode.episode_number)} - ${sanitize(episode.name)}`

            // Add the torrent
            winston.info('Adding to Transmission...')
            return transmission.addEpisode(magnet, directory, name)
          }).then(torrent => {
            // If no episode existed already, create the new one
            // Otherwise update some of the properties
            if (existingIndex === -1) {
              storedShow.episodes.push({
                name: sanitize(episode.name),
                season: episode.season_number,
                episode: episode.episode_number,
                transmission_id: torrent.id,
                added: !!torrent,
                completedPath: directory
              })
            } else {
              storedShow.episodes[existingIndex].added = !!torrent
              storedShow.episodes[existingIndex].completedPath = directory
            }

            db.shows.update(storedShow)

            if (torrent) {
              const message = `Started download for season ${episode.season_number} episode ${episode.episode_number} of ${showInfo.name}`
              notify(message)
              winston.info(message)
            }

            db.db.saveDatabase()
            episodeCallback(options.one)
          }).catch(err => {
            if (err) {
              winston.error(err)
            }

            db.db.saveDatabase()
            episodeCallback(options.one)
          })
        }, () => {
          winston.info(`Finished checking season ${season.season_number} of ${showInfo.name}`)
          seasonCallback(options.one)
        })
      })
    }, () => {
      db.shows.update(storedShow)
      db.db.saveDatabase(() => {
        winston.info(`Finished searching for episodes of ${showInfo.name}`)
      })
    })
  })
}
