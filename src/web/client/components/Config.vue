<template>
  <div v-if="config.locations" class="">
    <label for="directory">Config Directory</label>
    <input v-model="config.directory" id="directory" type="text" class="input-control">

    <label for="tv">TV Directory</label>
    <input v-model="config.locations.tv" type="text" id="tv" class="input-control">

    <label for="movies">Movies Directory</label>
    <input v-model="config.locations.movies" type="text" id="movies" class="input-control">

    <label>Movie Quality</label>
    <pete-select v-model="config.movies.quality" :options="['1080p', '720p']"></pete-select>

    <div class="mb-2">
      <label>
        <input v-model="config.movies.fallback" type="checkbox" class="mr-2">
        Fallback on Quality
      </label>
    </div>

    <div class="mb-2">
      <label>
        <input v-model="config.movies.useYify" type="checkbox" class="mr-2">
        Use YIFY
      </label>
    </div>

    <label for="pushbullet">Pushbullet token</label>
    <input v-model="config.pushbullet.token" type="text" class="input-control" id="pushbullet">

    <div class="mb-2">
      <label>
        <input v-model="config.pushbullet.notifyOnStart" type="checkbox" class="mr-2">
        Notify on Start
      </label>
    </div>

    <div class="mb-2">
      <label>
        <input v-model="config.pushbullet.notifyOnFinish" type="checkbox" class="mr-2">
        Notify on Finish
      </label>
    </div>

    <label for="trans-host">Transmission Host</label>
    <input v-model="config.transmission.host" type="text" class="input-control" id="trans-host">

    <label for="trans-port">Transmission Port</label>
    <input v-model="config.transmission.port" type="text" class="input-control" id="trans-port">

    <label for="trans-user">Transmission Username</label>
    <input v-model="config.transmission.user" type="text" class="input-control" id="trans-user">

    <label for="trans-pw">Transmission Password</label>
    <input v-model="config.transmission.pw" type="text" class="input-control" id="trans-pw">

    <label for="api-key">TMdb API Key</label>
    <input v-model="config.tmdb.apiKey" type="text" class="input-control" id="api-key">

    <label>TMdb Session ID</label>
    <input v-model="config.tmdb.sessionId" type="text" class="input-control" disabled>

    <!-- <button class="btn" @click.prevent="authenticate">Authorize Token</button> -->
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Config',

  data () {
    return {
      config: {}
    }
  },

  async created () {
    const { data: { data } } = await axios.get(`http://localhost:3030/api/config`)

    this.config = data
  },

  methods: {
    async authenticate () {
      const win = window.open('')

      try {
        const res = await axios.post(`http://localhost:3030/api/token`, this.config.tmdb.apiKey)

        win.location.href = `https://www.themoviedb.org/authenticate/${data}`
      } catch (err) {
        alert(err.message)
      }
    },

    async getSessionId () {
      const { data: { data } } = await axios.post(`http://localhost:3030/api/session`, this.config.tmdb.apiKey)
      this.config.tmdb.sessionId = data
    }
  }
}
</script>
