import { createRouter as createVueRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/oauth2/interaction/:uid',
    name: 'oauth-login',
    component: () => import('../pages/auth/LoginPage.vue'),
    props: true,
  },
  {
    path: '/oauth2/session',
    name: 'oauth-session',
    component: () => import('../pages/auth/SessionPage.vue'),
  },
  {
    path: '/admin/ui/tokens',
    name: 'admin-tokens',
    component: () => import('../pages/admin/TokensPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/oauth2/session',
  },
]

export const createRouter = () =>
  createVueRouter({
    history: createWebHistory(),
    routes,
  })
