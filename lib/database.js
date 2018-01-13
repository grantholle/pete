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
 * Gets or adds a collection
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
  return new Promise(async resolve => {
    await loadDatabase()

    // const existing = media.where(m => m.tmdb_id === showInfo.id)
    const existing = media.findOne({ tmdb_id: showInfo.id })

    if (existing) {
      return resolve(existing)
    }

    const now = moment()
    const startSeason = showInfo.seasons
      .sort((a, b) => b.seaon_number - a.seaon_number)
      .find(s => moment(s.air_date, 'YYYY-MM-DD') < now && s.season_number > 0)

    const imdbId = await moviedb.getImdbId(showInfo.id)

    const show = media.insert({
      name: sanitize(showInfo.name),
      tmdb_id: showInfo.id,
      start_season: startSeason ? startSeason.season_number : 1,
      start_episode: 1,
      episodes: [],
      quality: 'HDTV',
      use_alternate_quality: true,
      imdb_id: imdbId
    })

    await saveDatabase()
    resolve(show)
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
  return new Promise(async resolve => {
    await loadDatabase()

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

    await saveShow(show)
    resolve(show)
  })
}

/**
 * Retrieves a movie from the collection or creates a new one
 *
 * @param {Object} movieInfo The movie info object from TMdb
 * @returns {Promise}
 */
const findOrCreateMovie = movieInfo => {
  return new Promise(async resolve => {
    await loadDatabase()

    const existing = media.findOne({ tmdb_id: movieInfo.id })

    if (existing) {
      return resolve(existing)
    }

    const imdbId = await moviedb.getMovieImdbId(movieInfo.id)

    const movie = media.insert({
      name: sanitize(movieInfo.title),
      tmdb_id: movieInfo.id,
      added: false,
      attempts: 0,
      imdb_id: imdbId
    })

    await saveDatabase()
    resolve(movie)
  })
}

/**
 * Updates an item in the media collection and saves it to the file system
 *
 * @param {Object} show The show from the media collection
 * @returns {Promise}
 */
const updateCollection = async item => {
  await loadDatabase()
  await media.update(item)

  return saveDatabase()
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
const getTorrent = async torrentId => {
  await loadDatabase()

  return torrents.findOne({ torrentId })
}

/**
 * Saves or updates a torrent entry of the torrents collection
 *
 * @param {String} torrentId The transmission id
 * @param {String} newName The reformatted name of the torrent
 * @returns {Promise}
 */
const saveTorrent = (torrentId, newName) => {
  return new Promise(async resolve => {
    await loadDatabase()

    torrents.insert({ torrentId, newName })

    await saveDatabase()
    resolve()
  })
}

/**
 * Deletes an entry in the torrents collection
 *
 * @param {Integer} torrentId The transmission id
 * @returns {Promise}
 */
const deleteTorrent = async torrentId => {
  await loadDatabase()

  torrents.removeWhere({ torrentId })

  return saveDatabase()
}

/**
 * Deletes all entries in the torrents collection
 *
 * @returns {Promise}
 */
const deleteTorrents = async () => {
  await loadDatabase()

  torrents.chain().find().remove()

  return saveDatabase()
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
  deleteTorrent,
  deleteTorrents
}
