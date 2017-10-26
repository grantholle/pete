'use strict'

const p = require('path'),
      fs = require('fs-extra'),
      config = require('./config'),
      showListPath = p.join(config.directory, 'eztv-shows.json'),
      winston = require('./logger'),
      EZTV = require('eztv-api-pt'),
      eztv = new EZTV(),
      eachOfSeries = require('async').eachOfSeries,
      label = require('./show-label')

let showList = {}

try {
  showList = require(showListPath)
} catch (e) {}

module.exports = {
  showList,

  cacheShowList(silent = false) {
    return new Promise((resolve, reject) => {
      if (!silent) {
        winston.info('Retrieving EZTV show list...')
      }

      eztv.getAllShows().then(results => {
        this.showList = results

        fs.writeJson(showListPath, this.showList, { spaces: 2 }).then(() => {
          if (!silent) {
            winston.info('EZTV show list cached')
          }

          resolve()
        })
      }).catch(err => reject(err))
    })
  },

  getShowData(show) {
    winston.info(`Searching EZTV for ${show.name} ${label(show.season, show.episode)}`)

    return eztv.getShowData(show.eztv)
  },

  searchCache(name) {
    return new Promise((resolve, reject) => {
      winston.info(`Searching EZTV cache for ${name}`)

      // Function to search the shows for a matching title
      const search = (searchStr, list, exact = false) => {
        return list.filter(ele => {
          if (!exact) {
            const re = new RegExp(searchStr.replace("'", ''), 'ig')

            return ele.show.replace("'", '').search(re) !== -1
          }

          return ele.show.toLowerCase() == searchStr.toLowerCase()
        })
      },
      reduceMultipleHits = (results, name, cb) => {
        let newResult
        const nameWordLength = name.split(' ').length

        eachOfSeries(result, (item, key, callback) => {
          if (item.show.split(' ').length === nameWordLength) {
            newResult = item
            callback(true)
          }

          callback()
        }, found => {
          if (found) {
            winston.info(`Found EZTV entry for ${name}`)
            return cb(newResult)
          }

          cb(results)
        })
      }

      let parts = name.split(' ')
      let result = this.showList

      // If the title has more than one word, search by each word
      if (parts.length > 1) {
        eachOfSeries(parts, (item, key, callback) => {
          result = search(item, result)

          if (result.length === 1) {
            return callback(true)
          }

          callback(null)
        }, found => {
          // If there was one result found, we assume it's a successful match
          if (found) {
            result = result[0]
            winston.info(`Found EZTV entry for ${result.show}`)
            return resolve(result)
          }

          // If there was more than one result, one last attempt to find the right match based on word count
          reduceMultipleHits(result, name, resolve)
        })
      } else { // The title is one word, like "Survivor" and therefore has to be searched exactly
        result = search(name, result, true)
        if (result.length === 1) {
          winston.info(`Found EZTV entry for ${result.show}`)
          return resolve(result[0])
        }

        reduceMultipleHits(result, name, resolve)
      }
    })
  }

}
