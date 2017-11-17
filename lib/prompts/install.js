'use strict'

const shouldUpdate = (answers, key) => {
  return !answers.settings || answers.settings.indexOf(key) !== -1
}

module.exports = {
  begin: {
    name: 'begin',
    type: 'confirm',
    message: 'Begin installation?',
    default: true
  },
  changeCurrentSettings: {
    name: 'changeSettings',
    type: 'confirm',
    message: 'Pete has already been configured. Update settings?',
    default: true
  },
  confirmAuth: {
    name: 'appAuthorized',
    type: 'confirm',
    default: true,
    message: 'App authenticated?'
  },
  retryAuth: {
    name: 'retry',
    type: 'confirm',
    default: true,
    message: 'Retry authentication?'
  },
  cleanShows: {
    name: 'cleanShows',
    default: false,
    type: 'confirm',
    message: 'Shows detected in the database. Delete all show data (including episode data)?'
  },
  configQuestions (existing) {
    return [
      {
        name: 'settings',
        type: 'list',
        message: 'Pete has already been configured. Choose which aspects to update',
        choices: [
          'Movie and TV directories',
          'Movie quality',
          'Transmission configuration',
          'Pushbullet configuration',
          'TMdb configuration'
        ],
        when: () => existing
      },
      {
        name: 'locations.movies',
        type: 'input',
        message: 'Movies directory',
        when: answers => shouldUpdate(answers, 'Movie and TV directories')
      },
      {
        name: 'locations.tv',
        type: 'input',
        message: 'TV shows directory',
        when: answers => shouldUpdate(answers, 'Movie and TV directories')
      },
      {
        name: 'movies.quality',
        type: 'list',
        default: 0,
        message: 'Desired movie quality',
        choices: ['1080p', '720p'],
        when: answers => shouldUpdate(answers, 'Movie quality')
      },
      {
        name: 'movies.fallback',
        default: true,
        type: 'confirm',
        message: 'Use lower resolution as fallback?',
        when: answers => shouldUpdate(answers, 'Movie quality')
      },
      {
        name: 'movies.useYify',
        default: true,
        type: 'confirm',
        message: 'Use YIFY movie torrents?',
        when: answers => shouldUpdate(answers, 'Movie quality')
      },
      {
        name: 'transmission.user',
        type: 'input',
        message: 'Transmission RPC username',
        default: 'transmission',
        when: answers => shouldUpdate(answers, 'Transmission configuration')
      },
      {
        name: 'transmission.pw',
        type: 'input',
        message: 'Transmission RPC password',
        defaut: 'transmission',
        when: answers => shouldUpdate(answers, 'Transmission configuration')
      },
      {
        name: 'transmission.host',
        type: 'input',
        message: 'Transmission host location',
        default: 'localhost',
        when: answers => shouldUpdate(answers, 'Transmission configuration')
      },
      {
        name: 'transmission.port',
        type: 'input',
        message: 'Transmission port',
        default: 9091,
        when: answers => shouldUpdate(answers, 'Transmission configuration')
      },
      {
        name: 'pushbullet.token',
        message: 'Pushbullet API token',
        type: 'input',
        when: answers => shouldUpdate(answers, 'Pushbullet configuration')
      },
      {
        name: 'pushbullet.notifyOnStart',
        default: true,
        type: 'confirm',
        message: 'Get a notification when a Transmission download is started?',
        when: answers => shouldUpdate(answers, 'Pushbullet configuration')
      },
      {
        name: 'pushbullet.notifyOnFinish',
        default: true,
        type: 'confirm',
        message: 'Get a notification when a Transmission download is finished?',
        when: answers => shouldUpdate(answers, 'Pushbullet configuration')
      },
      {
        name: 'tmdb.apiKey',
        message: 'TMdb API key (v3)',
        type: 'input',
        when: answers => shouldUpdate(answers, 'TMdb configuration')
      }
    ]
  }
}
