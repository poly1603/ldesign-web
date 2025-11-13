# 项目管理功能说明

## 功能概览

项目管理模块提供了完整的项目导入、展示和管理功能，支持从本地文件系统导入项目，自动识别项目类型和框架。

## 功能特性

### 1. 项目展示
- **卡片式布局**：使用响应式网格布局展示所有项目
- **项目信息**：显示项目名称、路径、描述、版本、类型、框架和更新时间
- **项目类型识别**：
  - **项目**：安装了 `@ldesign/launcher`
  - **库**：安装了 `@ldesign/builder`
  - **库+项目**：同时安装了上述两者
  - **静态项目**：没有 package.json 或不符合上述条件

### 2. 项目导入
- **目录选择器**：可视化浏览文件系统选择项目目录
  - Windows 系统显示所有可用驱动器
  - 支持目录导航和返回上级
- **项目信息预览**：选择目录后自动读取并预览项目信息
- **自动识别**：
  - 从 package.json 读取项目名称、描述、版本
  - 自动检测项目类型（项目/库/库+项目/静态）
  - 识别前端框架（Vue/React/Angular/Next.js/Nuxt.js/Svelte）

### 3. 项目管理
- **删除项目**：从数据库中删除项目记录（不删除实际文件）
- **项目更新**：自动记录最后更新时间

## 后端API接口

### 基础 URL
```
http://localhost:7001/api/v1/projects
```

### 接口列表

#### 1. 获取所有项目
```
GET /projects
```

**响应示例**：
```json
{
  "code": 200,
  "message": "获取项目列表成功",
  "data": [
    {
      "id": 1,
      "name": "@ldesign/web",
      "path": "D:\\WorkBench\\ldesign\\tools\\web",
      "description": "管理系统前端",
      "version": "0.0.0",
      "type": "project",
      "framework": "Vue",
      "createdAt": "2025-11-12T14:00:00.000Z",
      "updatedAt": "2025-11-12T14:00:00.000Z"
    }
  ]
}
```

#### 2. 获取单个项目
```
GET /projects/:id
```

#### 3. 创建项目
```
POST /projects
Content-Type: application/json

{
  "name": "项目名称",
  "path": "项目路径",
  "description": "项目描述",
  "version": "1.0.0",
  "type": "project",
  "framework": "Vue"
}
```

#### 4. 更新项目
```
PUT /projects/:id
Content-Type: application/json

{
  "description": "新的描述",
  "version": "1.0.1"
}
```

#### 5. 删除项目
```
DELETE /projects/:id
```

#### 6. 读取项目信息（不保存）
```
POST /projects/read-info
Content-Type: application/json

{
  "path": "D:\\WorkBench\\ldesign\\tools\\web"
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "读取项目信息成功",
  "data": {
    "name": "@ldesign/web",
    "path": "D:\\WorkBench\\ldesign\\tools\\web",
    "description": "管理系统前端",
    "version": "0.0.0",
    "type": "project",
    "framework": "Vue",
    "hasPackageJson": true,
    "dependencies": {
      "vue": "^3.5.22",
      "vue-router": "^4.6.3",
      ...
    }
  }
}
```

#### 7. 导入项目（读取并保存）
```
POST /projects/import
Content-Type: application/json

{
  "path": "D:\\WorkBench\\ldesign\\tools\\web"
}
```

#### 8. 获取目录列表
```
GET /projects/directories/list?path=D:\WorkBench
```

不传 `path` 参数时返回根目录或驱动器列表。

## 数据库结构

### projects 表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 项目名称，唯一 |
| path | TEXT | 项目路径，唯一 |
| description | TEXT | 项目描述，可选 |
| version | TEXT | 项目版本，可选 |
| type | TEXT | 项目类型：project/library/hybrid/static |
| framework | TEXT | 框架类型，可选 |
| dependencies | JSON | 依赖列表，可选 |
| createdAt | DATETIME | 创建时间 |
| updatedAt | DATETIME | 更新时间 |

数据库文件位置：`tools/server/data/ldesign.db`

## 使用指南

### 1. 启动服务

**后端**：
```bash
cd D:\WorkBench\ldesign\tools\server
npm run start:dev
```

**前端**：
```bash
cd D:\WorkBench\ldesign\tools\web
npm run dev
```

### 2. 导入项目

1. 访问项目管理页面
2. 点击"导入项目"按钮
3. 点击"选择目录"打开目录选择器
4. 浏览并选择项目目录
5. 点击"确认"选择目录
6. 查看项目信息预览
7. 点击"确认导入"完成导入

### 3. 管理项目

- **查看项目**：所有项目以卡片形式展示
- **删除项目**：点击项目卡片右上角的删除按钮

## 技术架构

### 后端技术栈
- **NestJS**：Node.js 框架
- **TypeORM**：ORM 框架
- **SQLite**：嵌入式数据库
- **Node.js fs**：文件系统操作

### 前端技术栈
- **Vue 3**：渐进式框架
- **TypeScript**：类型安全
- **TDesign Vue Next**：UI 组件库
- **Fetch API**：HTTP 请求

### 关键实现

#### 项目类型识别逻辑
```typescript
const hasLauncher = !!packageJson.dependencies?.['@ldesign/launcher']
const hasBuilder = !!packageJson.dependencies?.['@ldesign/builder']

if (hasLauncher && hasBuilder) {
  type = 'hybrid' // 库+项目
} else if (hasLauncher) {
  type = 'project' // 项目
} else if (hasBuilder) {
  type = 'library' // 库
} else {
  type = 'static' // 静态项目
}
```

#### 框架识别逻辑
```typescript
const deps = { ...dependencies, ...devDependencies }
if (deps['vue']) framework = 'Vue'
else if (deps['react']) framework = 'React'
else if (deps['@angular/core']) framework = 'Angular'
else if (deps['next']) framework = 'Next.js'
else if (deps['nuxt']) framework = 'Nuxt.js'
else if (deps['svelte']) framework = 'Svelte'
```

## 文件结构

### 后端
```
tools/server/src/
├── projects/
│   ├── entities/
│   │   └── project.entity.ts       # 项目实体定义
│   ├── dto/
│   │   └── project.dto.ts          # 数据传输对象
│   ├── projects.controller.ts      # 控制器
│   ├── projects.service.ts         # 业务逻辑
│   └── projects.module.ts          # 模块配置
└── app.module.ts                   # 应用主模块（已更新）
```

### 前端
```
tools/web/src/
└── views/
    └── Project.vue                  # 项目管理页面
```

## 注意事项

1. **数据库同步**：开发环境 `synchronize: true` 会自动同步表结构，生产环境应设为 `false`
2. **路径唯一性**：同一路径只能导入一次，重复导入会提示错误
3. **文件系统权限**：某些系统目录可能无法访问，会自动跳过
4. **Windows 路径**：使用反斜杠 `\` 作为路径分隔符
5. **性能考虑**：大目录的子目录列表可能较多，已添加滚动支持

## 未来扩展

可考虑添加的功能：

1. 项目编辑功能
2. 项目搜索和筛选
3. 批量导入项目
4. 项目标签和分类
5. 项目统计信息
6. Git 仓库信息集成
7. 项目启动/构建快捷操作
8. 项目依赖更新检测
