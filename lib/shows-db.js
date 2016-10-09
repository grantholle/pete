'use strict'

const os = require('os'),
      p = require('path'),
      configDir = p.join(os.homedir(), '.config', 'cloud-city'),
      sqlite = require('sqlite3'),
      showsDb = new sqlite.Database(p.join(configDir, 'shows.db')),
      eachOf = require('async').eachOf,

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
              $t: show.eztv
            },
            query = row ? 'update shows set name = $n, start_season = $s, start_episode = $e, desired_quality = $q, eztv = $t where tmdb_id = $i' : 'insert into shows (tmdb_id, name, start_season, start_episode, desired_quality, eztv) values ($i, $n, $s, $e, $q, $t)'

            this.db.run(query, params, cb)
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
        createDbs() {
          const createShows = 'create table if not exists shows (tmdb_id integer primary key, name varchar(255), start_season integer, start_episode integer, desired_quality varchar(10), eztv text)',
                createDownloads = 'create table if not exists downloads (id integer primary key, tmdb_id integer, show varchar(255), episode_name varchar(255), episode integer, season integer, transmission_id integer, download_dir varchar(255), foreign key (tmdb_id) references shows(tmdb_id))'

          this.db.run(createShows, [], () => {
            this.db.run(createDownloads)
          })
        }
      }

module.exports = obj
