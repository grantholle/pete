'use strict'

module.exports = {
  shows (shows) {
    return {
      name: 'show',
      type: 'list',
      choices: shows.map(s => {
        return {
          name: `${s.name}${s.origin_country[0] ? ` (${s.origin_country[0]})`: ''}`,
          value: s.id
        }
      }),
      message: `Select the correct show (${shows.length} total)`,
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
      message: `Select the correct movie (${movies.length} total)`,
      default: 0
    }
  }
}
