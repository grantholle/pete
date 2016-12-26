'use strict'

let overwriteConfig = true,
    overwriteShows = true

const fs = require('fs'),
      os = require('os'),
      p = require('path'),
      util = require('util'),
      mkdirp = require('mkdirp'),
      jsonfile = require('jsonfile'),
      https = require('https'),
      configDir = p.join(os.homedir(), '.config', 'pete'),
      configPath = p.join(configDir, 'config.json'),
      prompt = require('prompt'),
      colors = require('colors'),
      open = require('open'),
      EZTV = require("eztv-api-pt"),
      eztv = new EZTV(),
      winston = require('./lib/logger'),
      installationMessage = '\nInstallation complete!'.blue,
      abortMessage = '\nInstallation aborted!'.red,

      createConfigDir = (cb) => {
        fs.stat(configDir, (err, stat) => {

          // If it doesn't exist, create it
          if (err) {
            mkdirp(configDir, err => {
              if (err)
                return process.nextTick(err)

              winston.info(`Created directory ${configDir}`)
              process.nextTick(cb, null)
            })
          } else {
            winston.info(`Config directory already exists`)
            process.nextTick(cb, null)
          }
        })
      },

      createFile = (filePath, obj, cb) => {
        jsonfile.writeFile(filePath, obj, err => {
          if (err)
            return process.nextTick(cb, err)

          winston.info(`Created ${filePath}`)
          process.nextTick(cb, null)
        })
      },

      getTmdbToken = (key, cb) => {
        const endpoint = `/3/authentication/token/new?api_key=${key}`

        sendRequest(endpoint, response => {
          cb(response)
        })
      },

      getTmdbSession = (key, token, cb) => {
        const endpoint = `/3/authentication/session/new?request_token=${token}&api_key=${key}`

        sendRequest(endpoint, response => {
          cb(response)
        })
      },

      sendRequest = (path, cb) => {
        var options = {
          "hostname": "api.themoviedb.org",
          "port": null,
          "path": path,
          "headers": {}
        }

        var req = https.get(options, function (res) {
          let chunks = []

          res.on("data", function (chunk) {
            chunks.push(chunk)
          })

          res.on("end", function () {
            let body = JSON.parse(Buffer.concat(chunks).toString())
            cb(body)
          })
        })
      },

      install = () => {
        if (overwriteConfig) {
          let promptSchema = [
            {
              name: 'moviesDir',
              required: true,
              description: 'Movie destination directory'
            },
            {
              name: 'tvDir',
              required: true,
              description: 'TV destination directory'
            },
            {
              name: 'movieQuality',
              required: true,
              default: '1080p',
              description: 'Desired movie quality. If any, will search starting with the highest quality. [1080p/720p]',
              pattern: /^720p$|^1080p$/i,
              message: "1080p or 720p",
            },
            {
              name: 'fallback',
              required: true,
              default: true,
              type: 'boolean',
              description: 'Use lower resolution as fallback? [t/f]',
              pattern: /^720p$|^1080p$|^BDRip$/i
            },
            {
              name: 'useYify',
              required: true,
              default: true,
              type: 'boolean',
              description: 'Use YIFY movie torrents? [t/f]'
            },
            {
              name: 'user',
              required: true,
              description: 'Transmission username',
              default: 'osmc'
            },
            {
              name: 'pw',
              required: true,
              description: 'Transmission password',
              default: 'osmc'
            },
            {
              name: 'host',
              required: true,
              description: 'Transmission host location',
              default: 'localhost'
            },
            {
              name: 'port',
              required: true,
              description: 'Transmission port',
              type: 'integer',
              default: 9091
            },
            {
              name: 'apiKey',
              required: true,
              description: 'Please enter your TMdb api key'
            },
            {
              name: 'pbToken',
              required: false,
              description: 'Pushbullet api token'
            },
            {
              name: 'notifyOnStart',
              default: 'true',
              description: 'Get a notification when a download is started?',
              type: 'boolean'
            },
            {
              name: 'notifyOnFinish',
              default: 'true',
              description: 'Get a notification when a download is finished?',
              type: 'boolean'
            }
          ]

          prompt.get(promptSchema, (err, result) => {
            if (err)
              return winston.info(abortMessage)

            let config = {
              tmdb: {
                apiKey: result.apiKey
              },
              pushbullet: {
                token: result.pbToken,
                notifyOnStart: result.notifyOnStart,
                notifyOnFinish: result.notifyOnFinish
              },
              transmission: {
                user: result.user,
                pw: result.pw,
                host: result.host,
                port: result.port
              },
              dir: {
                movies: result.moviesDir,
                tv: result.tvDir
              },
              movies: {
                quality: result.movieQuality,
                useYify: result.useYify,
                fallback: result.fallback
              }
            }

            // Get a token
            getTmdbToken(config.tmdb.apiKey, res => {
              if (res.success === false)
                return winston.error(res.status_message)

              const tokenUrl = `https://www.themoviedb.org/authenticate/${res.request_token}`

              // The user has to authenticate this app before they can use the TMdb api
              winston.info(`Please visit the following URL to authorize the app, then press ENTER to resume installation:\n`.green)
              winston.info(`\t${tokenUrl}\n`.magenta)
              open(tokenUrl)
              prompt.start()

              // Wait for the user to have authenticated, then get the session ID
              prompt.confirm('Authenticated [y/n]', (err, input) => {

                if (input) {
                  // Get the session id
                  getTmdbSession(config.tmdb.apiKey, res.request_token, res => {
                    if (res.success === false)
                      return winston.error(res.status_message)

                    // Set the session ID
                    config.tmdb.sessionId = res.session_id

                    // Finally write the configs, starting with the config directory
                    createConfigDir(() => {
                      const mediaDb = require('./lib/media-db'),
                            eztvCachePath = p.join(configDir, 'eztv-shows.json')

                      // Write the config file
                      jsonfile.spaces = 2
                      createFile(configPath, config, err => {
                        if (err)
                          return winston.error(err)
                      })

                      // create the torrent file folder
                      mkdirp(p.join(configDir, 'torrent-files'), () => { })

                      // Create the databases
                      mediaDb.createDbs(err => {
                        if (err)
                          return winston.error(err)

                        winston.info('Successfully created media database')
                      })

                      // Get the EZTV showlist to cache
                      createFile(eztvCachePath, [], err => {
                        if (err)
                          return winston.error(err)

                        // Create the file first because eztv can be fussy
                        winston.info('Retrieving EZTV showlist...')

                        // Retrieve showlist
                        eztv.getAllShows().then(results => {
                          // Write the results
                          jsonfile.writeFile(eztvCachePath, results, () => {
                            winston.info('EZTV showlist cached')
                          })
                        })
                      })
                    })
                  })
                } else {
                  return winston.info(abortMessage)
                }
              })
            })
          })
        } else if (overwriteShows) {
          const mediaDb = require('./lib/media-db')

          mediaDb.createDbs(err => {
            if (err)
              return winston.error(err)

            winston.info('Successfully created media database')
          })
        } else {
          winston.info(installationMessage)
        }
      }

// Kick off the installation
prompt.start()

// Check if the config already exists
// Prompt user to overwrite or not
fs.stat(configPath, (err, stat) => {
  if (err)
    return install()

  winston.info('Config files detected!'.yellow)

  // Prompt for config overwrite
  prompt.confirm({ name: 'config', description: 'Overwrite current configuration? [y/n]' }, (err, result) => {
    if (err)
      return winston.info(abortMessage)

    overwriteConfig = result

    // Prompt for removing downloads table
    prompt.confirm({ name: 'downloads', description: 'Remove show download history? [y/n]' }, (err, result) => {
      if (err)
        return winston.info(abortMessage)

      const mediaDb = require('./lib/media-db')

      if (result)
        mediaDb.deleteDownloads()

      // Prompt for deleting shows
      prompt.confirm({ name: 'shows', description: 'Overwrite entire shows configuration? [y/n]' }, (err, result) => {
        if (err)
        return winston.info(abortMessage)

        overwriteShows = result

        if (result)
          mediaDb.deleteShows()

        // Finally install
        install()
      })
    })
  })
})
