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
    path: '/projects/:id/library-build',
    name: 'LibraryBuild',
    component: () => import('../views/LibraryBuild.vue'),
    meta: { title: '打包库' },
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
  {
    path: '/projects/:id/config/app',
    name: 'ProjectConfigApp',
    component: () => import('../views/ProjectConfigApp.vue'),
    meta: { title: 'App 配置' },
  },
  {
    path: '/projects/:id/config/launcher',
    name: 'ProjectConfigLauncher',
    component: () => import('../views/ProjectConfigLauncher.vue'),
    meta: { title: 'Launcher 配置' },
  },
  {
    path: '/projects/:id/config/builder',
    name: 'ProjectConfigBuilder',
    component: () => import('../views/ProjectConfigBuilder.vue'),
    meta: { title: 'Builder 配置' },
  },
  {
    path: '/projects/:id/config/typescript',
    name: 'ProjectConfigTypeScript',
    component: () => import('../views/ProjectConfigTypeScript.vue'),
    meta: { title: 'TypeScript 配置' },
  },
  {
    path: '/projects/:id/config/package',
    name: 'ProjectConfigPackage',
    component: () => import('../views/ProjectConfigPackage.vue'),
    meta: { title: 'Package 配置' },
  },
  {
    path: '/docs/typescript/config',
    name: 'TypeScriptConfigDoc',
    component: () => import('../views/TypeScriptConfigDoc.vue'),
    meta: { title: 'TypeScript 配置文档' },
  },
  {
    path: '/docs/package/config',
    name: 'PackageConfigDoc',
    component: () => import('../views/PackageConfigDoc.vue'),
    meta: { title: 'Package 配置文档' },
  },
  {
    path: '/npm',
    name: 'NpmRegistry',
    component: () => import('../views/NpmRegistry.vue'),
    meta: { title: 'NPM 仓库管理' },
  },
  {
    path: '/node/versions',
    name: 'NodeVersionManager',
    component: () => import('../views/NodeVersionManager.vue'),
    meta: { title: 'Node 多版本管理' },
  },
  {
    path: '/npm/:id',
    name: 'NpmRegistryDetail',
    component: () => import('../views/NpmRegistryDetail.vue'),
    meta: { title: '仓库详情' },
  },
  {
    path: '/npm/:id/config',
    name: 'NpmVerdaccioConfig',
    component: () => import('../views/NpmVerdaccioConfig.vue'),
    meta: { title: 'Verdaccio 配置' },
  },
  {
    path: '/npm/:id/package/:packageName',
    name: 'NpmPackageDetail',
    component: () => import('../views/NpmPackageDetail.vue'),
    meta: { title: '包详情' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
