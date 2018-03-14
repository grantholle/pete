'use strict'

const config = require('../../../config')

module.exports = {
  async index (req, res) {
    res.json({ data: config })
  },

  async update (req, res) {
  }
}
