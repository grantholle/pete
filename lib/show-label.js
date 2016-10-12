'use strict'

module.exports = (season, episode) => {
  const pad = (n) => {
    var pad = new Array(3).join('0');
    return (pad + n).slice(-pad.length);
  }

  return `S${pad(season)}E${pad(episode)}`
}
