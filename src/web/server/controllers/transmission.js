'use strict'

const transmission = require('../../../transmission')

module.exports = {
  async index (req, res) {
    const { torrents } = await transmission.get()

    res.json({ data: torrents })
  },

  async show (req, res) {
    const { torrents } = await transmission.get(req.params.id)

    res.json({ data: torrents[0] })
  },

  async addMagnet (req, res) {
    const result = await transmission.addMagnet(req.body)

    res.json({ data: result })
  },

  async rename (req, res) {
    const result = await transmission.rename()

    res.json({ data: result })
  },

  async remove (req, res) {

    res.json({ data: result })
  }
}
