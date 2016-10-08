'use strict'

const os = require('os'),
      p = require('path'),
      configDir = p.join(os.homedir(), '.config', 'cloud-city'),
      sqlite = require('sqlite3'),
      showsDb = new sqlite.Database(p.join(configDir, 'shows.db')),

      obj = {
        db: showsDb,
        configDir,
        saveShow(show, cb) {

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
