import Vue from 'vue'
import Router from 'vue-router'
import Index from '@/components/Index'
import Transmission from '@/components/Transmission'
import Config from '@/components/Config'
import Show from '@/components/Shows'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Index',
      component: Index
    },
    {
      path: '/transmission',
      name: 'Transmission',
      component: Transmission
    },
    {
      path: '/config',
      name: 'Config',
      component: Config
    },
    {
      path: '/shows',
      name: 'Shows',
      component: Show
    }
  ]
})
