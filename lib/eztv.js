'use strict'

const os = require('os'),
      p = require('path'),
      showListPath = p.join(os.homedir(), '.config', 'pete', 'eztv-shows.json'),
      showList = require(showListPath),
      winston = require('./logger'),
      EZTV = require('eztv-api-pt'),
      eztv = new EZTV(),
      eachOfSeries = require('async').eachOfSeries,
      jsonfile = require('jsonfile'),
      label = require('./show-label')

module.exports = {

  showList,

  cacheShowList() {
    return new Promise((resolve, reject) => {
      winston.info('Retrieving EZTV show list...')

      eztv.getAllShows().then(results => {
        jsonfile.spaces = 2
        jsonfile.writeFile(showListPath, results, () => {
          this.showList = results
          winston.info('EZTV show list cached')

          resolve()
        })
      })
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
          } else {
            return ele.show.toLowerCase() == searchStr.toLowerCase()
          }
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
            winston.info(`Found EZTV entry for ${newResult.show}`)
            cb(newResult)
          } else {
            cb(results)
          }
        })
      }

      let parts = name.split(' ')
      let result = this.showList

      // If the title has more than one word, search by each word
      if (parts.length > 1) {
        eachOfSeries(parts, (item, key, callback) => {
          result = search(item, result)

          if (result.length === 1)
            callback(true)
          else
            callback(null)
        }, found => {
          // If there was one result found, we assume it's a successful match
          if (found) {
            result = result[0]
            winston.info(`Found EZTV entry for ${result.show}`)
            resolve(result)
          } else { // If there was more than one result, one last attempt to find the right match based on word count
            reduceMultipleHits(result, name, resolve)
          }

        })
      } else { // The title is one word, like "Survivor" and therefore has to be searched exactly
        result = search(name, result, true)
        if (result.length === 1) {
          winston.info(`Found EZTV entry for ${result.show}`)
          resolve(result[0])
        } else {
          reduceMultipleHits(result, name, resolve)
        }
      }
    })
  }

}
