#!/usr/bin/env node

'use strict'

const torrentId = process.env.TR_TORRENT_ID,
      winston = require('./logger'),
      fs = require('fs'),
      sanitize
