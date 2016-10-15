'use strict'

const os = require('os'),
      p = require('path'),
      configDir = p.join(os.homedir(), '.config', 'pete'),
      sqlite = require('sqlite3'),
      showsDb = new sqlite.Database(p.join(configDir, 'shows.db')),
      eachOf = require('async').eachOf,
      eachOfSeries = require('async').eachOfSeries,

      obj = {
        db: showsDb,
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
          this.db.run('insert into downloads (tmdb_id, show, episode_name, episode, season, transmission_id, download_dir) values (?, ?, ?, ?, ?, ?, ?)', [e.tmdb_id, e.name, e.epName, e.episode, e.season, e.transmissionId, e.downloadDir], cb)
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
        getAttempts(show, cb) {
          this.db.get('select attempts from attempts where tmdb_id = ? and season = ? and episode = ?', [show.tmdb_id, show.season, show.episode], (err, result) => {
            if (err)
              return cb(err)

            cb(null, result ? parseInt(result.attempts, 10) : 0)
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
        getShowsAndDownloads(cb) {
          this.db.all('select shows.tmdb_id, start_season, start_episode, desired_quality, name, eztv, season, episode from shows left join downloads on shows.tmdb_id = downloads.tmdb_id order by shows.tmdb_id', [], (err, rows) => {
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
        createDbs() {
          const createShows = 'create table if not exists shows (tmdb_id integer primary key, name varchar(255), start_season integer, start_episode integer, desired_quality varchar(10), eztv text)',
                createDownloads = 'create table if not exists downloads (id integer primary key, tmdb_id integer, show varchar(255), episode_name varchar(255), episode integer, season integer, transmission_id integer, download_dir varchar(255), foreign key (tmdb_id) references shows(tmdb_id))',
                createAttempts = 'create table if not exists attempts (id integer primary key, tmdb_id integer, season integer, episode integer, attempts integer, foreign key (tmdb_id) references shows(tmdb_id))'

          this.db.run(createShows, [], () => {
            this.db.run(createDownloads)
            this.db.run('drop table if exists attempts', [], err => {
              this.db.run(createAttempts)
            })
          })
        }
      }

module.exports = obj
