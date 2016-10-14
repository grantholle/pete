'use strict'

// Each object needs:
// {
//   tmdb show id
//   name
//   episode name
//   season
//   episode
//   eztv
//   quality
// }
let episodesToDownload = [],
    eztvShowCache = {},
    checkingCache = {}

const config = require('./config'),
      showsDb = require('./shows-db'),
      moviedb = require('./moviedb'),
      winston = require('./logger'),
      debug = winston.loggers.get('debug').debug,
      transmission = require('./transmission'),
      eztv = require('./eztv'),
      rargb = require('rargb'),
      p = require('path'),
      moment = require('moment'),
      sanitize = require('sanitize-filename'),
      eachOf = require('async').eachOf,
      eachOfSeries = require('async').eachOfSeries,
      now = moment().utcOffset(-5), // EST
      label = require('./show-label'),
      EPISODE_FAILURE_MAX = 4,

      processEpisode = item => {
        const copy = JSON.parse(JSON.stringify(item))

        searchForShowTorrent(copy, (err, url) => {
          if (err) {
            return winston.error(err)
          }

          if (url) {
            addToTransmission(copy, url, err => {
              if (err)
                return winston.error(err)
            })
          } else {
            winston.info(`No torrents could be found for ${item.name} ${label(item.season, item.episode)}`)
            showsDb.incrementAttempt(copy, err => {
              if (err)
                return winston.error(err)
            })
          }
        })
      },

      // Searches eztv and rargb as a fallback
      searchForShowTorrent = (show, cb) => {
        const safeName = sanitize(show.name),
              searchEztv = data => {
                let quality = show.quality.toUpperCase() === 'HDTV' ? '480p' : show.quality

                if (data.episodes.hasOwnProperty(show.season.toString())) {

                  try {
                    if (typeof data.episodes[show.season.toString()][show.episode.toString()][quality] !== 'undefined') {
                      winston.info(`Episode found! Adding ${show.name} for ${label(show.season, show.episode)} [${show.quality}]`)
                      const url = data.episodes[show.season.toString()][show.episode.toString()][quality].url

                      // Send the magnet url to callback
                      cb(null, url)
                    } else {
                      searchRargb(show, cb)
                    }
                  } catch (e) {
                    searchRargb(show, cb)
                  }
                } else {
                  searchRargb(show, cb)
                }
              }

        if (show.eztv.show) {
          if (eztvShowCache[safeName]) {
            searchEztv(eztvShowCache[safeName])
          } else if (checkingCache[safeName]) {
            // if we're currently fetching the show, wait until it's finished
            // otherwise will fetch the same show multiple times
            // add some delay otherwise the stack will... overflow ;)
            setTimeout(() => {
              searchForShowTorrent(show, cb)
            }, 1000)
          } else {
            checkingCache[safeName] = true
            eztv.getShowData(show).then(data => {
              eztvShowCache[safeName] = data
              checkingCache[safeName] = false
              searchEztv(data)
            }).catch(err => {
              // EZTV 'api' is unreliable since it isn't really an api, just an html scrape...
              checkingCache[safeName] = false
              winston.error(`EZTV 'api' error: ${err}`)
              searchRargb(show, cb)
            })
          }
        } else {
          searchRargb(show, cb)
        }
      },

      // One last ditch effort to find this episode
      searchAlternativeEztvQuality = (show, cb) => {
        const c = eztvShowCache[sanitize(show.name)]

        if (c) {
          if (c.episodes[show.season.toString()][show.episode.toString()]['480p']) {
            cb(null, c.episodes[show.season.toString()][show.episode.toString()]['480p'])
          } else if (c.episodes[show.season.toString()][show.episode.toString()]['720p']) {
            cb(null, c.episodes[show.season.toString()][show.episode.toString()]['720p'])
          } else {
            cb(null, false)
          }
        } else {
          cb(null, false)
        }
      },

      searchRargb = (show, cb) => {
        let searchStr = `${show.name} ${label(show.season, show.episode)}`

        winston.info(`Searching RARGB using search string: '${searchStr}'`)

        rargb.search({
          search_string: searchStr,
          sort: 'seeders'
        }).then(results => {
          const cat = show.quality.toUpperCase() === 'HDTV' ? 'tv episodes' : 'tv hd episodes'
          const altCat = show.quality.toUpperCase() === 'HDTV' ? 'tv hd episodes' : 'tv episodes'

          // First search for the config's quality
          // If nothing is found attempt to get the alternative quality instead
          let desiredQuality = results.find(item => item.category.toLowerCase() === cat)

          if (desiredQuality) {
            winston.info(`Episode found! Adding ${show.name} for ${label(show.season, show.episode)} [${show.quality}]`)
            cb(null, desiredQuality.download)
          } else {
            desiredQuality = results.find(item => item.category.toLowerCase() === altCat)

            if (desiredQuality) {
              winston.info(`Episode found! Adding ${show.name} for ${label(show.season, show.episode)} [${show.quality.toUpperCase() === 'HDTV' ? '720p' : 'HDTV'}]`)
              cb(null, desiredQuality.download)
            } else {
              searchAlternativeEztvQuality(show, cb)
            }
          }
        }).catch(err => {
          // no results found
          // Lastly, search eztv again for an alt quality
          if (err.error_code === 20)
            return searchAlternativeEztvQuality(show, cb)

          cb(err)
        })
      },

      addToTransmission = (show, magnetUrl, callback) => {
        show.downloadDir = p.join(config.dir.tv, sanitize(show.name), `Season ${show.season}`)

        transmission.addUrl(magnetUrl, { 'download-dir': show.downloadDir }, (err, torrent) => {
          if (err)
            return winston.error(err)

          winston.info(`Added torrent for ${show.name} ${label(show.season, show.episode)} - ${show.epName}`)
          show.transmissionId = torrent.id

          // Add this episode to the db so it doesn't get re-downloaded
          showsDb.addEpisode(show, callback)
        })
      }

module.exports = () => {
  // Get TV watchlist
  winston.info('Retrieving TV show watchlist...')

  // Get current shows and episodes that we've downloaded
  showsDb.getShowsAndDownloads((err, showsConfig) => {
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
              .filter(season => ((moment(`${season.air_date} 23:00 -05:00`, 'YYYY-MM-DD HH:mm ZZ') < now) && (parseInt(show.start_season, 10) <= season.season_number)))
              .sort((a, b) => a - b)

            eachOfSeries(applicableSeasons, (season, index, seasonCallback) => {
              if (!show.downloaded[season.season_number.toString()])
                show.downloaded[season.season_number.toString()] = []

              const episodes = show.downloaded[season.season_number.toString()],
                    isBaseSeason = show.start_season.toString() === season.season_number.toString()

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
                    // Since creating a date based on air_date will be at midnight, add several hours
                    if (!episode.air_date || moment(`${episode.air_date} 23:00 -05:00`, 'YYYY-MM-DD HH:mm ZZ') > now)
                      return episodeCb(null)

                    // If this is our base season, we need to make sure we've get >= our episode
                    // If this episode is equal or greater than our base episode, and we haven't already downloaded it
                    // OR a subsequent season we've started past our base season and we don't already have it
                    if ((isBaseSeason && parseInt(show.start_episode, 10) <= episode.episode_number && episodes.indexOf(episode.episode_number) === -1) || (episodes.indexOf(episode.episode_number) === -1)) {

                      if (parseInt(show.start_episode, 10) <= episode.episode_number && episodes.indexOf(episode.episode_number) === -1) {
                        const item = {
                          tmdb_id: watchlistShow.id,
                          name: show.name,
                          epName: episode.name,
                          season: season.season_number,
                          episode: episode.episode_number,
                          eztv: show.eztv,
                          quality: show.desired_quality
                        }

                        // If there has been too many attempts and no episode has been found
                        // Add to the downloads table as a prevention to check on it again
                        showsDb.getAttempts(item, (err, count) => {
                          if (count > EPISODE_FAILURE_MAX) {
                            showsDb.addEpisode(item, err => {
                              if (err)
                                return winston.error(err)

                              winston.info(`${item.name} ${label(item.season, item.episode)} has been attempted too many times, forgoing episode search permanently. reference: ${item.tmdb_id}, ${item.season}, ${item.episode}`)
                              episodeCb(null)
                            })
                          } else {
                            // winston.info(`Queueing ${show.name} ${label(item.season, item.episode)} for download`)
                            episodesToDownload.push(item)
                            processEpisode(item)
                            episodeCb(null)
                          }
                        })
                      }
                    } else {
                      episodeCb(null)
                    }
                  }, () => {
                    const seasonDownloads = episodesToDownload.filter(i => i.tmdb_id === watchlistShow.id && i.season === season.season_number)

                    if (seasonDownloads.length === 0)
                      winston.info(`Nothing needed for ${showResponse.name} in season ${season.season_number}`)

                    // Episode iteration has finished, continue season iteration
                    seasonCallback(null)
                  })
                })

              } else {
                winston.info(`Nothing needed for ${showResponse.name} in season ${season.season_number}`)
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
              id: showResponse.id,
              desired_quality: 'HDTV',
              start_episode: 1,
              downloaded: {}
            }

            // Get the most recent season number
            const mostRecentSeason = Math.max.apply(Math, showResponse.seasons.map(season => season.season_number)).toString()
            newShow.downloaded[mostRecentSeason] = []

            // get last aired season
            eachOfSeries(showResponse.seasons, (season, index, seasonIterationCb) => {
              newShow.start_season = season.season_number.toString()

              // If the air date is past now, add the previous season, break iteration
              if (moment(`${season.air_date} 23:00 -05:00`, 'YYYY-MM-DD HH:mm ZZ') > now) {
                const prevSeason = showResponse.seasons.find((ele) => {
                  return ele.season_number === season.season_number - 1
                })

                // If the show has existing seasons, add that instead
                if (prevSeason) {
                  newShow.start_season = prevSeason.season_number.toString()
                  delete newShow.downloaded[mostRecentSeason]
                  newShow.downloaded[newShow.start_season] = []
                }

                return seasonIterationCb(true)
              }

              // Continue iteration
              seasonIterationCb(null)
            }, () => {
              // get season info
              moviedb.tvSeasonInfo({ id: showResponse.id, season_number: newShow.start_season }, (err, seasonResponse) => {
                if (err)
                  return winston.error(err)

                // save eztv info
                eztv.searchCache(newShow.name).then(eztvInfo => {
                  newShow.eztv = eztvInfo

                  // Save this new show in the db
                  showsDb.saveShow(newShow, (err) => {
                    if (err)
                      return winston.error(err)

                    winston.info(`Saved configuration for ${newShow.name}`)
                  })

                  // save episode information
                  eachOfSeries(seasonResponse.episodes, (episode, key, episodeCallback) => {

                    if (moment(`${episode.air_date} 23:00 -05:00`, 'YYYY-MM-DD HH:mm ZZ') > now) {
                      const item = {
                        tmdb_id: watchlistShow.id,
                        name: newShow.name,
                        epName: episode.name,
                        season: newShow.start_season,
                        episode: episode.episode_number,
                        eztv: newShow.eztv,
                        quality: newShow.desired_quality
                      }

                      // winston.info(`Queueing ${newShow.name} season ${newShow.start_season}, episode ${episode.episode_number}`)
                      episodesToDownload.push(item)
                      processEpisode(item)
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

        // // process all the episodes to download
        // eachOfSeries(episodesToDownload, (item, index, callback) => {
        //   // Make a copy of the object to prevent being overwritten
        //   searchForShowTorrent(JSON.parse(JSON.stringify(item)), (err, url) => {
        //     if (err) {
        //       winston.error(err)
        //       return callback(null)
        //     }
        //
        //     addToTransmission(item, url, callback)
        //   })
        // }, () => { // all items iterated
          winston.info('Finished checking TV watchlist')
        // })
      }) // end eachOfSeries watchlist
    }) // end get watchlist
  }) // end get showsConfig
}
