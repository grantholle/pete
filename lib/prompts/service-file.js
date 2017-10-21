'use strict'

const username = require('os').userInfo().username

module.exports = {
  continue: {
    name: 'continue',
    type: 'confirm',
    message: 'Install Pete as a service?',
    default: true
  },
  username: {
    name: 'username',
    type: 'input',
    default: username,
    message: `The user used to run the service`
  },
  group: {
    name: 'group',
    type: 'input',
    default: username,
    message: `The group used to run the service`
  },
  overwrite: {
    name: 'overwrite',
    type: 'confirm',
    message: 'You have an existing service file ready to install. Use existing configuration?'
  },
  install: {
    name: 'install',
    type: 'confirm',
    message: 'Install the above configuration as a service?',
    default: true
  }
}