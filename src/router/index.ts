import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '概览' },
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('../views/Projects.vue'),
    meta: { title: '项目管理' },
  },
  {
    path: '/projects/:id',
    name: 'ProjectDetail',
    component: () => import('../views/ProjectDetail.vue'),
    meta: { title: '项目详情' },
  },
  {
    path: '/projects/:id/dev',
    name: 'ProjectDev',
    component: () => import('../views/ProjectDev.vue'),
    meta: { title: '启动项目' },
  },
  {
    path: '/projects/:id/build',
    name: 'ProjectBuild',
    component: () => import('../views/ProjectBuild.vue'),
    meta: { title: '打包项目' },
  },
  {
    path: '/projects/:id/preview',
    name: 'ProjectPreview',
    component: () => import('../views/ProjectPreview.vue'),
    meta: { title: '预览项目' },
  },
  {
    path: '/projects/:id/deploy',
    name: 'ProjectDeploy',
    component: () => import('../views/ProjectDeploy.vue'),
    meta: { title: '部署项目' },
  },
  {
    path: '/projects/:id/publish',
    name: 'ProjectPublish',
    component: () => import('../views/ProjectPublish.vue'),
    meta: { title: '发布库' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
