import Vue from 'vue'
import Router from 'vue-router'
import Index from '@/components/Index'
import Transmission from '@/components/Transmission'

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
    }
  ]
})
