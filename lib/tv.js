'use strict'

const config = require('./config'),
      shows = require('./config-shows'),
      showsConfig = shows.shows,
      moviedb = require('./moviedb'),
      winston = require('./logger'),
      transmission = require('./transmission')(config.transmission),
      eztv = require('./eztv'),
      rargb = require('rargb'),
      mkdirp = require('mkdirp'),
      p = require('path'),
      jsonfile = require('jsonfile'),
      moment = require('moment'),
      sanitize = require('sanitize-filename'),
      eachOf = require('async').eachOf,
        eachOfSeries = require('async').eachOfSeries,
      today = moment(),

      pad = (n, p = 2, c = '0') => {
        var pad = new Array(1 + p).join(c);
        return (pad + n).slice(-pad.length);
      },

      // updateShowStatus = (show) => {
      //
      // },
      //
      // checkShowStatus = (show, showInfo, cb) => {
      //   const isRecurringShow = showInfo.status.toLowerCase() == 'returning series'
      //
      //   // If it's no longer a recurring show, remove show from watchlist
      //   if (!isRecurringShow) {
      //     moviedb.accountWatchlistUpdate({ id: '{account_id}', media_type: 'tv', media_id: showInfo.id, watchlist: false }, err => {
      //       if (err)
      //         return winston.error(err)
      //
      //       cb(null)
      //     })
      //   } else {
      //     // Check to see if there are any future episodes
      //     eachOfSeries(showInfo.seasons, (season, index, callback) => {
      //       const airDate = moment(season.air_date, 'YYYY-MM-DD')
      //
      //       if (airDate > today) {
      //         show.isPaused = false
      //         callback(true)
      //       } else {
      //         callback()
      //       }
      //     }, () => {
      //       cb(null)
      //     })
      //   }
      // },

      // Searches eztv and rargb as a fallback
      searchForShowTorrent = (show, cb) => {

        eztv.getShowData(show).then(data => {
          const quality = show.quality.toUpperCase() === 'HDTV' ? '480p' : show.quality

          if (data.episodes.hasOwnProperty(show.season.toString())) {

            if (typeof data.episodes[show.season.toString()][show.episode.toString()][quality] !== 'undefined') {
              winston.info(`Episode found! Adding ${show.name} for season ${show.season}, episode ${show.episode} [${show.quality}]`)
              const url = data.episodes[show.season.toString()][show.episode.toString()][quality].url

              // Send the magnet url to callback
              cb(null, url)
            }
          } else {
            searchRargb(show, cb)
          }
        }).catch(err => {
          // EZTV 'api' is unreliable since it isn't really an api, just an html scrape...
          winston.error(`EZTV 'api' error: ${err}`)
          searchRargb(show, cb)
        })
      },

      searchRargb = (show, cb) => {
        let searchStr = `${show.name} S${pad(show.season)}E${pad(show.episode)} ${show.quality}`

        winston.info(`Searching RARGB using search string: '${searchStr}'`)

        rargb.search({
          search_string: searchStr,
          sort: 'seeders',
          category: show.quality.toUpperCase() === 'HDTV' ? rargb.categories.TV_EPISODES : rargb.categories.TV_HD_EPISODES
        }).then(results => {

          if (results.torrent_results && results.torrent_results.length > 0) {
            winston.info(`Episode found! Adding ${show.name} for season ${show.season}, episode ${show.episode} [${show.quality}]`)
            cb(null, results.torrent_results[0].download)
          } else {
            cb(`No torrents could be found for ${show.name}, season ${show.season}, episode ${show.episode} [${show.quality}]`, {})
          }
        }).catch(err => winston.error(err))
      },

      addToTransmission = (show, magnetUrl, callback) => {
        const downloadDir = p.join(config.dir.tv, sanitize(show.name), `Season ${show.season}`)
        mkdirp(downloadDir)

        transmission.addUrl(magnetUrl, { 'download-dir': downloadDir }, (err, torrent) => {
          if (err)
            return winston.error(err)

          winston.info(`Added torrent for ${show.name} S${pad(show.season)}E${pad(show.episode)}!`)

          // Add this episode to the config so it doesn't get re-downloaded
          showsConfig[show.tmdb_id].downloaded[show.season.toString()].push(parseInt(show.episode, 10))
          callback(null)
        })
      }

let episodesToDownload = []
// Each object needs:
// {
//   tmdb show id
//   name
//   season
//   episode
//   eztv
//   quality
// }

// Get TV watchlist
winston.info('Retrieving TV show watchlist...')

moviedb.accountTvWatchlist({ id: '{account_id}' }, (err, watchlistResponse) => {
  if (err)
    return winston.error(err)

  if (watchlistResponse.total_results === 0)
    return winston.info('No shows found in watchlist!')

  winston.info(`${watchlistResponse.total_results} ${watchlistResponse.total_results > 1 ? 'shows are' : 'show is'} in your watchlist.`)

  // Iterate through each show synchronously (hopefully prevent TMDB rate limits)
  eachOfSeries(watchlistResponse.results, (watchlistShow, key, watchlistIterationCb) => {

    // Get show info
    winston.info(`Getting show information for ${watchlistShow.name}...`)
    moviedb.tvInfo({ id: watchlistShow.id }, (err, showResponse) => {
      if (err)
        return winston.error(err)

      // Flag for whether the show has ended/cancelled or will still make new episodes
      const isRecurringShow = showResponse.status.toLowerCase() == 'returning series'

      // if: config exists for this show
      if (showsConfig.hasOwnProperty(watchlistShow.id.toString())) {
        let show = showsConfig[watchlistShow.id.toString()]

        // Get the show's seasons that we're concerned with:
        // Seasons that have started airing and seasons greater than or equal to our base season
        const applicableSeasons = showResponse.seasons
          .filter(season => ((moment(season.air_date, 'YYYY-MM-DD') < today) && (parseInt(show.season, 10) <= season.season_number)))
          .sort((a, b) => a - b)

        eachOfSeries(applicableSeasons, (season, index, seasonCallback) => {
          if (!show.downloaded[season.season_number.toString()])
            show.downloaded[season.season_number.toString()] = []

          const episodes = show.downloaded[season.season_number.toString()],
                isBaseSeason = show.season.toString() === season.season_number.toString()

          // If our seasons don't match the total seasons of the show
          if (season.episode_count !== episodes.length) {
            winston.info(`Checking for needed episodes for ${showResponse.name} in season ${season.season_number}`)

            // Deep dive into the season to see what we're missing
            moviedb.tvSeasonInfo({ id: showResponse.id, season_number: season.season_number }, (err, seasonResponse) => {
              if (err)
                return winston.error(err)

              // Iterate each episode of the season
              eachOf(seasonResponse.episodes, (episode, i, episodeCb) => {

                // If the episode hasn't shown yet, skip it
                if (!episode.air_date || moment(episode.air_date, 'YYYY-MM-DD') > today)
                  return episodeCb(null)

                // If this is our base season, we need to make sure we've get >= our episode
                if (isBaseSeason) {

                  // If this episode is equal or greater than our base episode, and we haven't already downloaded it
                  if (parseInt(show.episode, 10) <= episode.episode_number && episodes.indexOf(episode.episode_number) === -1) {
                    winston.info(`Queueing ${show.name} season ${season.season_number}, episode ${episode.episode_number} for download`)
                    episodesToDownload.push({
                      tmdb_id: watchlistShow.id,
                      name: show.name,
                      season: season.season_number,
                      episode: episode.episode_number,
                      eztv: show.eztv,
                      quality: show.quality
                    })
                  }
                } else if (episodes.indexOf(episode.episode_number) === -1) { // A subsequent season we've started past our base season and we don't already have it
                  // If we've made it to this point, this is an episode we need to download
                  winston.info(`Queueing ${show.name} season ${season.season_number}, episode ${episode.episode_number}`)
                  episodesToDownload.push({
                    tmdb_id: watchlistShow.id,
                    name: show.name,
                    season: season.season_number,
                    episode: episode.episode_number,
                    eztv: show.eztv,
                    quality: show.quality
                  })
                } else {
                  winston.info(`Nothing needed for ${showResponse.name} in season ${season.season_number}`)
                }

                // Continue episode iteration
                episodeCb(null)
              }, seasonCallback) // Episode iteration has finished, continue season iteration
            })

          } else {
            seasonCallback(null)
          }
        }, () => {
          // Iterating applicableSeasons has finished
          watchlistIterationCb(null)
        })

      } else { // else config doesn't exist:
        winston.info(`No configuration exists for ${showResponse.name}. Creating default configuration now.`)
        // set up some defaults
        let newShow = showsConfig[showResponse.id.toString()] = {
          name: showResponse.name,
          quality: 'HDTV',
          downloaded: {}
        }

        // Get the most recent season number
        const mostRecentSeason = Math.max.apply(Math, showResponse.seasons.map(season => season.season_number)).toString()
        newShow.downloaded[mostRecentSeason] = []

        // get last aired season
        eachOfSeries(showResponse.seasons, (season, index, seasonIterationCb) => {
          newShow.season = season.season_number.toString()

          // If the air date is past today, add the previous season, break iteration
          if (moment(season.air_date, 'YYYY-MM-DD') > today) {
            const prevSeason = showResponse.seasons.find((ele) => {
              return ele.season_number === season.season_number - 1
            })

            // If the show has existing seasons, add that instead
            if (prevSeason) {
              newShow.season = prevSeason.season_number.toString()
              newShow.episode = '1'
              delete newShow.downloaded[mostRecentSeason]
              newShow.downloaded[newShow.season] = []
            }

            return seasonIterationCb(true)
          }

          // Continue iteration
          seasonIterationCb(null)
        }, () => {
          // get season info
          moviedb.tvSeasonInfo({ id: showResponse.id, season_number: newShow.season }, (err, seasonResponse) => {
            if (err)
              return winston.error(err)

            // save eztv info
            eztv.searchCache(newShow.name).then(eztvInfo => {
              newShow.eztv = eztvInfo
              newShow.episode = '1' // No sense in starting in the middle or end of a season, grab the entire last season

              // save episode information
              eachOfSeries(seasonResponse.episodes, (episode, key, episodeCallback) => {

                if (moment(episode.air_date, 'YYYY-MM-DD') > today) {
                  winston.info(`Queueing ${newShow.name} season ${newShow.season}, episode ${episode.episode_number}`)
                  episodesToDownload.push({
                    tmdb_id: watchlistShow.id,
                    name: newShow.name,
                    season: newShow.season,
                    episode: episode.episode_number,
                    eztv: newShow.eztv,
                    quality: newShow.quality
                  })
                }

                episodeCallback(null)
              }, () => {
                winston.info(`Default configuration complete for ${newShow.name}.`)
                watchlistIterationCb(null)
              }) // end episode iteration
            }) // end eztv search cache
          }) // end tv show info
        }) // end season iteration
      } // end no config
    }) // end get show info
  }, () => { // finished iterating eachOfSeries watchlist

    // process all the episodes to download
    eachOfSeries(episodesToDownload, (item, index, callback) => {
      // Make a copy of the object to prevent being written over
      searchForShowTorrent(JSON.parse(JSON.stringify(item)), (err, url) => {
        if (err) {
          winston.error(err)
          return callback(null)
        }

        addToTransmission(item, url, callback)
      })
    }, () => { // all items iterated
      // Save shows configuration
      shows.save(msg => winston.info(msg))
    })
  }) // end eachOfSeries watchlist
}) // end get watchlist
