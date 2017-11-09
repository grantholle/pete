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
  searchForEpisode = require('../tv-search'),
  EPISODE_FAILURE_MAX = 24 // An entire day at checking once an hour -- move to config?

let now = moment()

module.exports = config => {
  now = moment()

  // Get TV watchlist
  winston.info('Retrieving TV show watchlist...')

  moviedb.getTvWatchlist().then(watchlist => {
    if (watchlist.total_results === 0) {
      winston.info('No shows found in watchlist!')
      process.exit()
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

        // Try to retrieve this show from our database
        return models.show.findOne({
          where: {
            tmdb_id: show.id
          },
          include: [{
            model: models.download,
            as: 'episodes'
          }]
        })
      }).then(existingShow => {
        // If we have an existing configuration
        // Return continue with the current configuration
        if (!existingShow) {
          // If we don't have any settings for this show, let's create a default one
          winston.info(`No configuration exists for ${showInfo.name}. Creating default configuration now.`)

          // Sort desc then grab the first one that doesn't have an air_date
          // that's past today's date
          const start_season = showInfo.seasons
            .sort((a, b) => b.seaon_number - a.seaon_number)
            .find(s => moment(s.air_date, 'YYYY-MM-DD') < now && s.season_number > 0)

          return models.show.create({
            name: sanitize(showInfo.name),
            tmdb_id: showInfo.id,
            start_season: start_season ? start_season.season_number : 1
          })
        }

        return existingShow.reload()
      }).then(show => {
        if (show.imdb_id) {
          return show
        }

        return new Promise(resolve => {
          moviedb.getImdbId(show.tmdb_id).then(imdb_id => {
            show.imdb_id = imdb_id
            return show.save()
          }).then(show => resolve(show))
        })
      }).then(show => {
        // Process a season's episodes
        const processSeason = (season, startEpisode) => {
          winston.info(`Checking season ${season} of ${show.name}`)

          // Get the season information for the season we currently want
          moviedb.getSeasonInfo(show.tmdb_id, season).then(res => {
            // Only get episodes that are greater than the starting episde
            // and we don't have an unadded episode that is released
            // and the attempts is less than the max allowed
            let episodes = res.episodes.filter(e => e.episode_number >= startEpisode &&
              (!show.episodes || !show.episodes.some(se => se.episode === e.episode_number && se.added)))

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
              if (now < moment(episode.air_date, 'YYYY-MM-DD')) {
                show.next_air_date = episode.air_date
                show.start_episode = episode.episode_number
                return callback(true)
              }

              winston.info(`Searching for season ${episode.season_number} episode ${episode.episode_number} of ${show.name}`)

              let directory = p.join(config.locations.tv, show.name, `Season ${episode.season_number}`)

              searchForEpisode(show, episode).then(magnet => {
                winston.info(`Episode${magnet ? ' ' : ' not '}found for season ${episode.season_number} episode ${episode.episode_number} of ${show.name}`)

                // Don't add anything if a magnet wasn't found
                if (!magnet) {
                  return false
                }

                // Add the torrent
                return transmission.addEpisode(magnet, directory)
              }).then(torrent => {
                if (torrent) {
                  const message = `Started download for season ${episode.season_number} episode ${episode.episode_number} of ${show.name}`
                  notify(message)
                  winston.info(message)
                }

                // If there's an existing entry for this episode
                // increment the attempt count
                // Set an existing episode entry
                const existingEpisode = show.episodes.find(e => e.season === episode.season_number && e.episode === episode.episode_number)

                if (existingEpisode) {
                  return existingEpisode.update({
                    attempts: existingEpisode.attempts++,
                    added: !!torrent
                  })
                }

                // Create the download object if there wasn't an existing episode
                return models.download.create({
                  name: sanitize(episode.name),
                  tmdb_id: show.tmdb_id,
                  season: episode.season_number,
                  episode: episode.episode_number,
                  transmission_id: torrent ? torrent.id : null,
                  added: !!torrent,
                  completedPath: torrent ? p.join(directory, torrent.name) : directory,
                  show_id: show.id
                })
              })
              .then(download => show.addEpisode(download)) // Associate the download with the show
              .then(attachedShow => attachedShow.reload()) // Reload the show with the episode attached
              .then(reloadedShow => {
                show = reloadedShow
                callback()
              }).catch(err => {
                winston.error(err)
                callback()
              })
            }, endedEarly => {
              if (endedEarly) {
                return show.save()
              }

              // Check if there's a next season
              const nextSeason = showInfo.seasons.find(s => s.season_number === season + 1)

              // If there's a season after the current one,
              // change the settings and check it for episodes
              if (nextSeason) {
                show.start_season++
                show.start_episode = 1
                return processSeason(nextSeason.season_number, 1)
              }

              show.save()
              watchlistCallback()
            }) // End episode iteration
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
