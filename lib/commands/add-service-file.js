'use strict'

const fs = require('fs-extra')
const p = require('path')
const workingDirectory = p.join(__dirname, '..', '..')
const startScript = p.join(workingDirectory, 'scripts', 'start.js')
const winston = require('../logger')
const inquirer = require('inquirer')
const exec = require('child_process').exec
const prompts = require('../prompts').installService

require('colors')

module.exports = config => {
  const configServiceFilePath = p.join(config.directory, 'pete.service')

  if (process.platform.toLowerCase() !== 'linux') {
    winston.info(`Your current platform (${process.platform}) does not support the use of systemd service files. Please research ways of running a node script as a process in your current platform.`)
    process.exit()
  }

  // Make sure the user wants to continue
  inquirer.prompt(prompts.continue).then(answer => {
    if (!answer.continue) {
      return
    }

    // Check to see if an existing attempt service file exists in the config directory
    // If it has attempt to use that one or install fresh
    fs.pathExists(configServiceFilePath).then(existingServiceFile => {
      if (existingServiceFile) {
        return inquirer.prompt(prompts.overwrite)
      }

      return { overwrite: true }
    }).then(answer => {
      return new Promise((resolve, reject) => {
        // Use existing configured service file
        if (!answer.overwrite) {
          return resolve()
        }

        // Ask for the username and group to run the process as
        inquirer.prompt([prompts.username, prompts.group]).then(answers => {
          fs.readFile(p.join(workingDirectory, 'pete.service'), 'utf8', (err, contents) => {
            if (err) {
              return reject(err)
            }

            // Fill in the variables
            contents = contents
              .replace('$dir', workingDirectory)
              .replace('$start', startScript)
              .replace('$user', answers.username)
              .replace('$group', answers.group)

            // Write to the config directory to be copied later
            fs.writeFile(configServiceFilePath, contents, err => {
              if (err) {
                return reject(err)
              }

              resolve()
            })
          })
        })
      })
    }).then(() => {
      return new Promise((resolve, reject) => {
        // Create the service file
        fs.readFile(configServiceFilePath, 'utf8', (err, contents) => {
          if (err) {
            return reject(err)
          }

          console.log(contents)

          inquirer.prompt(prompts.install).then(answer => resolve(answer))
        })
      })
    }).then(answer => {
      if (!answer.install) {
        return winston.info(`A configuration has been saved to ${configServiceFilePath}. You can modify that file and rerun '${'pete f'.green}' to install that service file.`)
      }

      exec(`sudo cp ${configServiceFilePath} /lib/systemd/system/pete.service && sudo systemctl daemon-reload && sudo systemctl start pete`, (err, stdout) => {
        if (err) {
          return winston.error(err)
        }

        console.log(stdout)
        winston.info('Successfully installed Pete as a systemd service')
      })
    }).catch(err => {
      winston.error(err)
      process.exit()
    })
  })
}
