'use strict'

const _ = require('lodash')

module.exports = {
  continue: {
    name: 'continue',
    type: 'confirm',
    message: 'Begin TV setup?',
    default: true
  },
  confirm(name) {
    return {
      name: 'overwrite',
      type: 'confirm',
      default: true,
      message: `${name} has already been set up. Overwrite?`
    }
  },
  configureShow(show) {
    return [
      {
        name: 'start_season',
        type: 'input',
        message: `Start ${show.name} on season (of ${show.number_of_seasons} seasons)`,
        default: show.number_of_seasons,
        validate: answer => _.isNumber(parseFloat(answer))
      },
      {
        name: 'start_episode',
        type: 'input',
        message: `Episode`,
        default: 1,
        validate: answer => _.isNumber(parseFloat(answer))
      },
      {
        name: 'quality',
        type: 'list',
        choices: ['HDTV', '720p', '1080p'],
        message: 'Quality',
        default: 0
      },
      {
        name: 'use_fallback_quality',
        type: 'confirm',
        default: true,
        message: 'If needed, use a lower quality?',
        when: answers => answers.quality !== 'HDTV'
      }
    ]
  }
}
