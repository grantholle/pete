'use strict'

module.exports = {
  shows (shows) {
    return {
      name: 'show',
      type: 'list',
      choices: shows.map(s => {
        return {
          name: `${s.name}${s.origin_country[0] ? ` (${s.origin_country[0]})` : ''}`,
          value: s.id
        }
      }),
      message: `Select the title (${shows.length} total)`,
      default: 0
    }
  },
  watchlistShows (shows) {
    return {
      name: 'shows',
      type: 'checkbox',
      choices: shows.map(s => {
        return {
          name: `${s.name}`,
          value: s.id
        }
      }),
      message: `Select the show(s) you wish to check`,
      default: 0
    }
  },
  movies (movies) {
    return {
      name: 'movie',
      type: 'list',
      choices: movies.map(m => {
        return {
          name: `${m.title} (${m.release_date.substr(0, 4)})`,
          value: m.id
        }
      }),
      message: `Select the movie (${movies.length} total)`,
      default: 0
    }
  }
}
