'use strict'

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
    message: ''
  },
  cleanDownloads: {
    name: 'cleanShows',
    default: false,
    type: 'confirm',
    message: ''
  },
  configQuestions: [
    {
      name: 'locations.movies',
      type: 'input',
      message: 'Movies directory'
    },
    {
      name: 'locations.tv',
      type: 'input',
      message: 'TV shows directory'
    },
    {
      name: 'movies.quality',
      type: 'choice',
      default: 0,
      message: 'Desired movie quality',
      choices: ['1080p', '720p']
    },
    {
      name: 'movies.fallback',
      default: true,
      type: 'confirm',
      message: 'Use lower resolution as fallback?'
    },
    {
      name: 'movies.useYify',
      default: true,
      type: 'confirm',
      message: 'Use YIFY movie torrents?'
    },
    {
      name: 'transmission.user',
      type: 'input',
      message: 'Transmission RPC username',
      default: 'debian-transmission'
    },
    {
      name: 'transmission.pw',
      type: 'input',
      message: 'Transmission RPC password'
    },
    {
      name: 'transmission.host',
      type: 'input',
      message: 'Transmission host location',
      default: 'localhost'
    },
    {
      name: 'transmission.port',
      type: 'input',
      message: 'Transmission port',
      default: 9091
    },
    {
      name: 'pushbullet.token',
      message: 'Pushbullet API token',
      type: 'input'
    },
    {
      name: 'pushbullet.notifyOnStart',
      default: true,
      type: 'confirm',
      message: 'Get a notification when a Transmission download is started?'
    },
    {
      name: 'pushbullet.notifyOnFinish',
      default: true,
      type: 'confirm',
      message: 'Get a notification when a Transmission download is finished?'
    },
    {
      name: 'tmdb.apiKey',
      message: 'TMdb API key',
      type: 'input'
    }
  ]
}