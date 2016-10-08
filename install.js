'use strict'

let overwriteConfig = true,
    overwriteShows = true,
    res = {
      config: false,
      library: false
    }

const fs = require('fs'),
      os = require('os'),
      p = require('path'),
      util = require('util'),
      mkdirp = require('mkdirp'),
      jsonfile = require('jsonfile'),
      https = require('https'),
      configDir = p.join(os.homedir(), '.config', 'cloud-city'),
      configPath = p.join(configDir, 'config.json'),
      prompt = require('prompt'),
      colors = require('colors'),
      open = require('open'),
      EZTV = require("eztv-api-pt"),
      eztv = new EZTV(),
      winston = require('./lib/logger'),
      installationMessage = '\nInstallation complete! '.blue,
      abortMessage = '\nInstallation aborted!'.red,
      createShows = 'create table if not exists shows (tmdb_id integer primary key, name varchar(255), start_season integer, start_episode integer, desired_quality varchar(10), eztv text)',
      createDownloads = 'create table if not exists downloads (id integer primary key, tmdb_id integer, name varchar(255), episode integer, season integer, transmission_id integer, download_dir varchar(255), foreign key (tmdb_id) references shows(tmdb_id))',

      promptSchema = [
        {
          name: 'moviesDir',
          required: true,
          description: 'Movies directory'
        },
        {
          name: 'tvDir',
          required: true,
          description: 'TV directory'
        },
        {
          name: 'movieQuality',
          required: true,
          default: '1080p',
          description: 'Desired movie quality. If any, will search starting with the highest quality. [BDRip/1080p/720p/any]',
          pattern: /^720p$|^1080p$|^BDRip|^any$/i,
          message: "Must be either BDRip, 1080p, 720p, or any",
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
        }
      ],

      createConfigDir = (cb) => {
        fs.stat(configDir, (err, stat) => {

          // If it doesn't exist, create it
          if (err) {
            mkdirp(configDir, err => {
              if (err)
                throw err

              winston.info(`Created directory ${configDir}`)
              cb()
            })
          } else {
            winston.info(`Config directory already exists`)
            cb()
          }
        })
      },

      createFile = (filePath, obj, cb) => {
        jsonfile.writeFile(filePath, obj, err => {
          if (err)
            throw err

          winston.info(`Created ${filePath}`)
          cb()
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

      setupTvShows = () => {
        require('./lib/tv-setup')
      },

      install = () => {
        if (overwriteConfig) {
          prompt.get(promptSchema, (err, result) => {
            let config = {
              tmdb: {
                apiKey: result.apiKey
              },
              pushbullet: {
                token: result.pbToken
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
              prompt.confirm('Continue [yes/no]', (err, input) => {

                if (input) {
                  // Get the session id
                  getTmdbSession(config.tmdb.apiKey, res.request_token, res => {
                    if (res.success === false)
                      return winston.error(res.status_message)

                    // Set the session ID
                    config.tmdb.sessionId = res.session_id

                    // Finally write the configs
                    createConfigDir(() => {
                      const showsDb = require('./lib/shows-db')

                      // Create the databases if they don't exist
                      showsDb.createDbs()

                      // Get the EZTV showlist to cache
                      createFile(p.join(configDir, 'eztv-shows.json'), [], () => {
                        winston.info('Retrieving EZTV showlist...')
                        eztv.getAllShows().then(results => {
                          jsonfile.spaces = 2
                          jsonfile.writeFile(p.join(configDir, 'eztv-shows.json'), results, () => {
                            winston.info('EZTV showlist cached')
                            winston.info(installationMessage)
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
          // TV prompting
          setupTvShows()
        } else {
          winston.info(installationMessage)
        }
      }

// Kick off the installation
prompt.start()

// Check if the config already exists
// Prompt user to overwrite or not
fs.stat(configPath, (err, stat) => {
  if (err) {
    install()
  } else {
    const schema = [
      {
        name: 'config',
        description: 'Overwrite current configuration? [y/n]'
      },
      {
        name: 'downloads',
        description: 'Remove show download history? [y/n]'
      },
      {
        name: 'shows',
        description: 'Overwrite entire shows configuration? [y/n]'
      }
    ]

    winston.info('Config files detected!'.yellow)
    prompt.confirm(schema[0], (err, result) => {
      if (err)
        return winston.info(abortMessage)

      overwriteConfig = result

      prompt.confirm(schema[1], (err, result) => {
        if (err)
          return winston.info(abortMessage)

        const shows = require('./lib/shows-db')

        if (result) {
          shows.db.run('drop table if exists downloads')
        }

        prompt.confirm(schema[2], (err, result) => {
          if (err)
            return winston.info(abortMessage)

          overwriteShows = result

          if (result) {
            shows.db.run('drop table if exists shows')
          }

          install()
        })
      })
    })
  }
})
