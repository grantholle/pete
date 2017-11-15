'use strict'

module.exports = shows => {
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
}
