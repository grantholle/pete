'use strict'

const moviedb = require('../moviedb'),
      winston = require('../logger'),
      transmission = require('../transmission'),
      notify = require('../pushbullet').started,
      p = require('path'),
      moment = require('moment'),
      sanitize = require('sanitize-filename'),
      async = require('async'),
      models = require('../models'),
      searchForEpisode = require('../tv-search')

module.exports = (config, tmdb_id, options) => {
  let showInfo

  // Get show information
  moviedb.tvInfo(tmdb_id).then(show => {
    showInfo = show
    showInfo.quality = options.quality ? options.quality : 'HDTV'
    winston.info(`Getting show information for ${show.name}`)
  })
  .then(() => moviedb.getImdbId(showInfo.id)) // Fetch the show's imdb id
  .then(imdb_id => showInfo.imdb_id = imdb_id) // Set the underlying show object
  .then(() => models.download.find({ where: { tmdb_id } })) // Fetch any existing downloads
  .then(downloads => {
    downloads = downloads ? downloads : []

    // Only pull seasons that are greater than or equal to the season option
    const seasons = showInfo.seasons.filter(s => s.season_number >= options.season)

    // Iterate those seasons to get the episodes
    async.eachSeries(seasons, (season, seasonCallback) => {
      winston.info(`Checking season ${season.season_number} of ${showInfo.name}`)

      // Get season information
      moviedb.getSeasonInfo(showInfo.id, season.season_number).then(seasonData => {
        // Iterate each episode to search for it
        async.eachSeries(seasonData.episodes, (episode, episodeCallback) => {
          // Check if there's any existing episodes that we've attempted
          const existing = downloads.find(d => d.season === episode.season_number &&
            d.episode === episode.episode_number && d.added && !options.force)

          // If there is an existing download
          // Or the episode hasn't aired continue the episode iteration
          if (existing || moment() < moment(episode.air_date, 'YYYY-MM-DD')) {
            return episodeCallback()
          }

          winston.info(`Searching for season ${episode.season_number} episode ${episode.episode_number} of ${showInfo.name}`)
          let directory = p.join(config.locations.tv, showInfo.name, `Season ${episode.season_number}`)

          searchForEpisode(showInfo, episode).then(magnet => {
            winston.info(`Episode${magnet ? ' ' : ' not '}found for season ${episode.season_number} episode ${episode.episode_number} of ${showInfo.name}`)

            // Don't add anything if a magnet wasn't found
            if (!magnet) {
              return false
            }

            // Add the torrent
            return transmission.addEpisode(magnet, directory)
          }).then(torrent => {
            if (!torrent) {
              return false
            }

            const message = `Started download for season ${episode.season_number} episode ${episode.episode_number} of ${showInfo.name}`
            notify(message)
            winston.info(message)

            return models.download.create({
              tmdb_id: tmdb_id,
              name: sanitize(episode.name),
              season: season,
              episode: episode.episode_number,
              transmission_id: torrent ? torrent.id : null,
              added: true,
              completedPath: p.join(directory, torrent.name)
            })
          }).then(() => {
            episodeCallback()
          }).catch(err => {
            winston.error(err)
            episodeCallback()
          })
        }, () => {
          winston.info(`Finished checking season ${season.season_number} of ${showInfo.name}`)
          seasonCallback()
        })
      })
    }, () => {
      winston.info(`Finished searching for episodes of ${showInfo.name}`)
    })
  })
}
