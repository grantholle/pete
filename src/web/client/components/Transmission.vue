<template>
  <div>
    <div class="torrent-card" v-for="torrent in torrents" :key="torrent.id">
      <div class="hidden lg:block text-grey float-right text-sm">Added {{ moment(torrent.addedDate * 1000).format('MMM Do') }}</div>

      <div class="mb-2">
        <a href="#" @click.prevent="expandDetails(torrent)" class="text-black text-lg inline-block">{{ torrent.name }}</a>
        <div class="inline-block text-sm text-grey">{{ statusKey[torrent.status] }}</div>
      </div>

      <div class="w-full h-3 bg-grey-light">
        <div class="h-full" :class="torrent.class" :style="{ width: torrent.width }"></div>
      </div>

      <div class="mt-2 clearfix">
        <div class="torrent-info-badge">
          {{ torrent.width }}
        </div>

        <div class="torrent-info-badge">
          {{ prettyBytes(torrent.totalSize) }}
        </div>

        <div class="torrent-info-badge">
          Uploaded {{ prettyBytes(torrent.uploadedEver) }}
        </div>

        <div class="torrent-info-badge" v-if="torrent.isDownloading">
          Downloading from {{ torrent.peersSendingToUs }} @ {{ prettyBytes(torrent.rateDownload) }}/s
        </div>

        <div class="torrent-info-badge" v-if="torrent.isDownloading || torrent.isSeeding">
          Seeding to {{ torrent.peersGettingFromUs }} @ {{ prettyBytes(torrent.rateUpload) }}/s
        </div>

        <div v-if="torrent.eta > 0 && torrent.isDownloading" class="torrent-info-badge">
          ETA {{ moment().add(torrent.eta, 'seconds').fromNow() }}
        </div>

        <div v-if="torrent.eta < 0 && torrent.isDownloading" class="torrent-info-badge">
          ETA unknown
        </div>

        <div class="torrent-info-badge">
          {{ (torrent.uploadRatio).toFixed(2) }} Ratio
        </div>
      </div>

      <tabs v-if="torrent.expanded" :options="{ useUrlFragment: false }">
        <tab name="Files">
          <table class="table">
            <thead>
              <tr>
                <th>Percent Done</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in torrent.files" :key="file.name">
                <td class="py-1">{{ Math.round((file.bytesCompleted / file.length) * 100) }}%</td>
                <td class="py-1">{{ file.name }}</td>
              </tr>
            </tbody>
          </table>
        </tab>

        <tab name="Peers">
          <table class="table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Port</th>
                <th>Client</th>
                <th>From</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="peer in torrent.peers" :key="peer.address">
                <td>{{ peer.address }}</td>
                <td>{{ peer.port }}</td>
                <td>{{ peer.clientName }}</td>
                <td>{{ prettyBytes(peer.rateToClient) }}</td>
                <td>{{ prettyBytes(peer.rateToPeer) }}</td>
              </tr>
            </tbody>
          </table>
        </tab>

        <tab name="Trackers">
          <table class="table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Last Announce Result</th>
                <th>Next Announce</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tracker in torrent.trackerStats" :key="tracker.id">
                <td>{{ tracker.host }}</td>
                <td>{{ tracker.lastAnnounceResult }}</td>
                <td>{{ moment(tracker.nextAnnounceTime * 1000).fromNow() }}</td>
              </tr>
            </tbody>
          </table>
        </tab>
      </tabs>

    </div>
  </div>
</template>

<script>
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import { toByteArray } from 'base64-js'
import BitField from 'bitfield-base64'

export default {
  name: 'Transmission',

  data () {
    return {
      torrents: [],
      moment,
      prettyBytes,
      expanded: false,
      statusKey: {
        0: `Stopped`,
        1: `Queued to check files`,
        2: `Checking files`,
        3: `Queued to download`,
        4: `Downloading`,
        5: `Queued to seed`,
        6: `Seeding`,
        7: `Can't find peers`
      }
    }
  },

  created () {
    const socket = new WebSocket(`ws://localhost:3030`)

    socket.addEventListener('message', event => {
      try {
        this.torrents = JSON.parse(event.data).map(t => {
          t.expanded = this.expanded === t.id
          t.isDownloading = t.status === 4
          t.isSeeding = t.status === 6

          t.class = {
            'bg-blue-dark': t.isDownloading || t.isSeeding,
            'bg-grey-dark': t.status === 0
            // 'bg-green-dark': t.isSeeding
          }

          t.width = `${Math.round(t.percentDone * 100)}%`

          const bf = new BitField(t.pieces)
          t.piecesArray = bf.toArray()

          return t
        })
      } catch (err) {
        console.error(err)
      }
    })

    const pingInterval = setInterval(() => {
      try {
        socket.send(JSON.stringify({ args: 'ping' }))
      } catch (err) {
        clearInterval(pingInterval)
      }
    }, 25000)
  },

  methods: {
    expandDetails (torrent) {
      if (this.expanded === torrent.id) {
        torrent.expanded = !torrent.expanded
        this.expanded = false
        return
      }

      this.torrents.forEach(t => {
        t.expanded = false
      })

      torrent.expanded = true
      this.expanded = torrent.id
    },

    toggleTab (ref) {
      console.log(this.$refs[ref])
    }
  }
}
</script>
