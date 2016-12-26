'use strict'

const os = require('os'),
      p = require('path'),
      fs = require('fs'),
      configDir = p.join(os.homedir(), '.config', 'pete'),
      sqlite = require('sqlite3'),
      mediaDb = new sqlite.Database(p.join(configDir, 'media.db')),
      eachOf = require('async').eachOf,
      eachOfSeries = require('async').eachOfSeries,

      obj = {
        db: mediaDb,
        configDir,
        saveShow(show, cb) {
          this.db.get('select tmdb_id from shows where tmdb_id = ?', [show.id], (err, row) => {
            if (err)
              return cb(err)

            const params = {
              $i: show.id,
              $n: show.name,
              $s: show.start_season,
              $e: show.start_episode,
              $q: show.desired_quality,
              $t: JSON.stringify(show.eztv)
            },
            query = row ? 'update shows set name = $n, start_season = $s, start_episode = $e, desired_quality = $q, eztv = $t where tmdb_id = $i' : 'insert into shows (tmdb_id, name, start_season, start_episode, desired_quality, eztv) values ($i, $n, $s, $e, $q, $t)'

            this.db.run(query, params, cb)
          })
        },
        addEpisode(e, cb) {
          this.db.run('insert into downloads (tmdb_id, show, name, episode, season, transmission_id, transmission_name, download_dir) values (?, ?, ?, ?, ?, ?, ?, ?)', [e.tmdb_id, e.name, e.epName, e.episode, e.season, e.transmission_id, e.transmission_name, e.downloadDir], cb)
        },
        addMovieDownload(movie) {
          this.db.run('insert into downloads (tmdb_id, name, transmission_id, transmission_name, download_dir) values (?, ?, ?, ?, ?)', [movie.tmdb_id, movie.title, movie.transmission_id, movie.transmission_name, movie.dir])
        },
        getInprogress(tmdb_id, cb) {
          this.db.all('select * from downloads where renamed = 0', [], cb)
        },
        updateRenamed(id, cb) {
          this.db.run('update downloads set renamed = 1 where id = ?', [id], cb)
        },
        incrementStartSeason(tmdb_id, cb) {
          this.db.run('update shows set start_season = start_season + 1 where tmdb_id = ?', [tmdb_id], cb)
        },
        incrementAttempt(show, cb) {
          const params = [show.tmdb_id, show.season, show.episode]

          this.db.get('select id, attempts from attempts where tmdb_id = ? and season = ? and episode = ?', params, (err, result) => {
            if (err)
              return cb(err)

            if (result) {
              this.db.run('update attempts set attempts = ? where id = ?', [result.attempts + 1, result.id], cb)
            } else {
              this.db.run('insert into attempts (tmdb_id, season, episode) values (?, ?, ?)', params, cb)
            }
          })
        },
        incrementMovieAttempt(tmdb_id, cb) {
          this.db.get('select id, attempts from attempts where tmdb_id = ?', [tmdb_id], (err, result) => {
            if (err)
              return process.nextTick(cb, err)

            if (result) {
              this.db.run('update attempts set attempts = ? where id = ?', [result.attempts + 1, result.id], cb)
            } else {
              this.db.run('insert into attempts (tmdb_id) values (?)', [tmdb_id], cb)
            }
          })
        },
        getShowAttempts(show, cb) {
          this.db.get('select attempts from attempts where tmdb_id = ? and season = ? and episode = ?', [show.tmdb_id, show.season, show.episode], (err, result) => {
            if (err)
              return cb(err)

            cb(null, result ? parseInt(result.attempts, 10) : 0)
          })
        },
        getMovieAttempts(tmdb_id, cb) {
          this.db.get('select attempts from attempts where tmdb_id = ?', [tmdb_id], (err, result) => {
            if (err)
              return process.nextTick(cb, err)

            process.nextTick(cb, null, result ? parseInt(result.attempts, 10) : 0)
          })
        },
        getShows(cb) {
          this.db.all('select * from shows', [], (err, rows) => {
            if (err)
              return cb(err)

            let shows = {}
            eachOf(rows, (show, i, callback) => {
              shows[show.tmdb_id.toString()] = show
              callback(null)
            }, () => {
              cb(null, shows)
            })
          })
        },
        getShow(tmdb_id, cb) {
          this.db.get('select * from shows where tmdb_id = ?', [tmdb_id], cb)
        },
        getAllDownloads(cb) {
          this.db.all('select * from downloads', [], cb)
        },
        getDownloads(show, cb) {
          this.db.all('select * from downloads where tmdb_id = ?', [show.tmdb_id], cb)
        },
        getDownloadByTransmissionId(id, cb) {
          this.db.get('select * from downloads where transmission_id = ?', [id], cb)
        },
        setAsRenamedByTransmissionId(id) {
          this.db.run('update downloads set renamed = 1 where transmission_id = ?', [id])
        },
        getShowsAndDownloads(cb) {
          this.db.all('select shows.tmdb_id, start_season, start_episode, desired_quality, shows.name, eztv, season, episode from shows left join downloads on shows.tmdb_id = downloads.tmdb_id order by shows.tmdb_id', [], (err, rows) => {
            if (err)
              return cb(err)

            let shows = {}

            eachOfSeries(rows, (row, i, callback) => {
              if (shows.hasOwnProperty(row.tmdb_id.toString()) && row.season && row.episode) {
                if (shows[row.tmdb_id.toString()].downloaded.hasOwnProperty(row.season.toString())) {
                  shows[row.tmdb_id.toString()].downloaded[row.season.toString()].push(row.episode)
                } else {
                  shows[row.tmdb_id.toString()].downloaded[row.season.toString()] = [row.episode]
                }
              } else {
                shows[row.tmdb_id.toString()] = {
                  name: row.name,
                  desired_quality: row.desired_quality,
                  start_season: row.start_season,
                  start_episode: row.start_episode,
                  eztv: JSON.parse(row.eztv),
                  downloaded: {}
                }

                if (row.season && row.episode)
                  shows[row.tmdb_id.toString()].downloaded[row.season.toString()] = [row.episode]
              }

              callback(null)
            }, (err) => {
              cb(err, shows)
            })
          })
        },
        createDbs(cb) {
          fs.readFile(p.join(__dirname, '..', 'schema.sql'), 'utf8', (err, sql) => {
            if (err)
              return process.nextTick(err)

            this.db.exec(sql, cb)
          })
        },
        deleteDownloads() {
          this.db.run('drop table if exists downloads')
        },
        deleteShows() {
          this.db.run('drop table if exists shows')
        },
        close() {
          this.db.close()
        }
      }

module.exports = obj
