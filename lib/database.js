'use strict'

let media
let torrents

const Loki = require('lokijs')
const config = require('./config')
const sanitize = require('sanitize-filename')
const moviedb = require('./moviedb')
const moment = require('moment')
const db = new Loki(config.databaseFilePath)

/**
 *
 * @param {String} name The name of the collection
 * @param {Array} option The array for the collection's unique and indices
 * @returns {Collection}
 */
const initializeCollection = (name, option = []) => {
  let collection = db.getCollection(name)

  if (!collection) {
    collection = db.addCollection(name, {
      unique: option
    })
  }

  return collection
}

/**
 * Sets up the collections for the database
 */
const initializeDatabase = () => {
  media = initializeCollection('media', ['tmdb_id'])
  torrents = initializeCollection('torrents')
}

/**
 * Loads the database from the file system
 *
 * @returns {Promise}
 */
const loadDatabase = () => {
  return new Promise((resolve, reject) => {
    db.loadDatabase({}, err => {
      if (err) {
        return reject(err)
      }

      initializeDatabase()
      resolve()
    })
  })
}

/**
 * Saves the database to the file system
 *
 * @returns {Promise}
 */
const saveDatabase = () => {
  return new Promise((resolve, reject) => {
    db.saveDatabase(err => {
      if (err) {
        return reject(err)
      }

      resolve()
    })
  })
}

/**
 * Retrieves a show from the collection or creates a new one
 *
 * @param {Object} showInfo The tv show info object from TMdb
 * @returns {Promise}
 */
const findOrCreateShow = showInfo => {
  return new Promise(resolve => {
    loadDatabase().then(() => {
      // const existing = media.where(m => m.tmdb_id === showInfo.id)
      const existing = media.findOne({ tmdb_id: showInfo.id })

      if (existing) {
        return resolve(existing)
      }

      const now = moment()
      const startSeason = showInfo.seasons
        .sort((a, b) => b.seaon_number - a.seaon_number)
        .find(s => moment(s.air_date, 'YYYY-MM-DD') < now && s.season_number > 0)

      const show = media.insert({
        name: sanitize(showInfo.name),
        tmdb_id: showInfo.id,
        start_season: startSeason ? startSeason.season_number : 1,
        start_episode: 1,
        episodes: [],
        quality: 'HDTV',
        use_alternate_quality: true
      })

      moviedb.getImdbId(show.tmdb_id).then(imdbId => {
        show.imdb_id = imdbId

        return saveDatabase()
      }).then(() => {
        resolve(show)
      })
    })
  })
}

/**
 * Adds or creates an episode of a show
 *
 * @param {Object} show The show from the media collection
 * @param {Object} episode The episode object from TMdb season info
 * @param {Boolean} torrentAdded Whether the torrent has been added
 */
const updateOrCreateEpisode = (show, episode, torrentAdded) => {
  return new Promise(resolve => {
    loadDatabase().then(() => {
      // If there's an existing entry for this episode
      // increment the attempt count
      // Set an existing episode entry
      const existingIndex = show.episodes.findIndex(e => e.season === episode.season_number && e.episode === episode.episode_number)

      if (existingIndex !== -1) {
        show.episodes[existingIndex].attempts++
        show.episodes[existingIndex].added = torrentAdded
      } else {
        // Create the download object if there wasn't an existing episode
        show.episodes.push({
          name: sanitize(episode.name),
          season: episode.season_number,
          episode: episode.episode_number,
          added: torrentAdded,
          attempts: 1
        })
      }

      saveShow(show).then(() => {
        resolve(show)
      })
    })
  })
}

/**
 * Retrieves a movie from the collection or creates a new one
 *
 * @param {Object} movieInfo The movie info object from TMdb
 * @returns {Promise}
 */
const findOrCreateMovie = movieInfo => {
  return new Promise(resolve => {
    loadDatabase().then(() => {
      const existing = media.findOne({ tmdb_id: movieInfo.id })

      if (existing) {
        return resolve(existing)
      }

      const movie = media.insert({
        name: sanitize(movieInfo.title),
        tmdb_id: movieInfo.id,
        added: false,
        attempts: 0
      })

      moviedb.getMovieImdbId(movie.tmdb_id).then(imdbId => {
        movie.imdb_id = imdbId

        return saveDatabase()
      }).then(() => {
        resolve(movie)
      })
    })
  })
}

/**
 * Updates an item in the media collection and saves it to the file system
 *
 * @param {Object} show The show from the media collection
 * @returns {Promise}
 */
const updateCollection = item => {
  return loadDatabase().then(() => {
    return media.update(item)
  }).then(() => {
    return saveDatabase()
  })
}

/**
 * Updates a show and saves it to the file system
 *
 * @param {Object} show The show from the media collection
 * @returns {Promise}
 */
const saveShow = show => {
  return updateCollection(show)
}

/**
 * Updates a movie and saves it to the file system
 *
 * @param {Object} movie The movie from the media collection
 * @returns {Promise}
 */
const saveMovie = movie => {
  return updateCollection(movie)
}

/**
 *
 * @param {Integer} torrentId The transmission id
 */
const getTorrent = torrentId => {
  return loadDatabase().then(() => {
    return torrents.findOne({ torrentId })
  })
}

/**
 * Saves or updates a torrent entry of the torrents collection
 *
 * @param {String} torrentId The transmission id
 * @param {String} newName The reformatted name of the torrent
 * @returns {Promise}
 */
const saveTorrent = (torrentId, newName) => {
  return new Promise(resolve => {
    loadDatabase().then(() => {
      torrents.insert({ torrentId, newName })
      return saveDatabase()
    }).then(() => resolve())
  })
}

/**
 * Deletes an entry in the torrents collection
 *
 * @param {Integer} torrentId The transmission id
 * @returns {Promise}
 */
const deleteTorrent = torrentId => {
  return loadDatabase().then(() => {
    torrents.removeWhere({ torrentId })

    return saveDatabase()
  })
}

module.exports = {
  get media () {
    return media
  },
  get torrents () {
    return torrents
  },
  loadDatabase,
  updateOrCreateEpisode,
  findOrCreateShow,
  findOrCreateMovie,
  saveShow,
  saveMovie,
  getTorrent,
  saveTorrent,
  deleteTorrent
}
