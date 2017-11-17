#!/usr/bin/env node
'use strict'

const winston = require('../lib/logger')
const notify = require('../lib/pushbullet').finished

let msg = `${process.env.TR_TORRENT_NAME} has finished downloading.`

// Log the message and send a notification about what has been completed
winston.info(msg)
notify(msg)
