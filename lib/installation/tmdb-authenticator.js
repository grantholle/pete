'use strict'

const https = require('https')
const _ = require('lodash')
const sendRequest = (path, cb) => {
  var options = {
    hostname: 'api.themoviedb.org',
    port: null,
    path,
    headers: {}
  }

  return new Promise((resolve, reject) => {
    https.get(options, res => {
      let chunks = []

      res.on('data', chunk => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        let body = JSON.parse(Buffer.concat(chunks).toString())

        if (body.success === false) {
          return reject(body.status_message)
        }

        resolve(body)
      })

      res.on('error', err => {
        reject(err)
      })
    })
  })
}

module.exports = {
  getToken: key => {
    return new Promise((resolve, reject) => {
      sendRequest(`/3/authentication/token/new?api_key=${key}`).then(res => {
        if (_.isUndefined(res.request_token)) {
          return reject(res.status_message)
        }

        resolve(res.request_token)
      }).catch(err => reject(err))
    })
  },
  getSessionId: (key, token) => {
    return new Promise((resolve, reject) => {
      sendRequest(`/3/authentication/session/new?request_token=${token}&api_key=${key}`).then(res => {
        if (_.isUndefined(res.session_id)) {
          return reject(res.status_message)
        }

        resolve(res.session_id)
      }).catch(err => reject(err))
    })
  }
}
