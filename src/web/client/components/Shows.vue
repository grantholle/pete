<template>
  <div class="flex flex-wrap justify-between -m-2">
    <div v-for="show in shows" :key="show.id" class="w-1/3 px-2">
      <div class="flex">
        <img :src="`//image.tmdb.org/t/p/w500${show.poster_path}`" :alt="show.name" class="block flex-1">
        <div class="flex-1">
          Some text
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Shows',

  data () {
    return {
      shows: []
    }
  },

  async created () {
    const { data: { data } } = await axios.get(`http://localhost:3030/api/watchlist/tv`)
    this.shows = data.results

    // const { data: { data } } = await axios.get(`http://localhost:3030/api/shows`)
  },

  methods: {
    async authenticate () {
      const win = window.open('')

      try {
        const res = await axios.post(`http://localhost:3030/api/token`, this.config.tmdb.apiKey)
        console.log(res)

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
