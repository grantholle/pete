<template>
  <div id="app">
    <nav class="mb-8 bg-grey-darker shadow-md lg:fixed lg:pin-t w-full">
      <div class="container m-auto flex items-center justify-between flex-wrap">
        <router-link class="mr-6 inline-block text-2xl font-mono h-full text-white no-underline hover:underline hover:text-indigo-lightest" to="/">Pete</router-link>

        <div class="w-full block flex-grow lg:flex lg:items-center lg:w-auto">
          <div class="text-sm lg:flex-grow main-nav">
            <router-link v-for="link in links" :key="link.to" :to="link.to" class="block mt-4 lg:inline-block lg:mt-0 text-white p-4 text-base no-underline hover:text-indigo-darkest hover:bg-grey-lighter">{{ link.text }}</router-link>
          </div>
        </div>
      </div>
    </nav>
    <router-view class="px-4"  />
  </div>
</template>

<script>
import '@/assets/styles.css'

export default {
  name: 'App',
  data () {
    return {
      links: [
        { to: '/transmission', text: 'Transmission' }
      ]
    }
  }
}
</script>

<style>

</style>
