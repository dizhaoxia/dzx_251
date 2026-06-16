import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import ClassroomPage from '@/pages/ClassroomPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/classroom',
    name: 'classroom',
    component: ClassroomPage,
  },
  {
    path: '/about',
    name: 'about',
    component: {
      template: '<div class="text-center text-xl p-8">About Page - Coming Soon</div>',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
