# 系统信息页面

## 功能说明

新增系统信息页面，用于展示服务器的详细系统信息。该页面调用 `tools/server` 的 `/api/v1/system/info` 接口获取数据。

## 页面内容

系统信息页面包含以下模块：

### 1. 基本信息
- 应用名称
- 应用版本
- 运行环境（development/production）
- 系统状态
- 运行时间（格式化显示为：X天 X小时 X分钟 X秒）
- Node.js 版本

### 2. 系统信息
- 主机名
- 操作系统
- 平台
- 架构
- 系统版本
- CPU 核心数

### 3. CPU 信息
- CPU 型号
- CPU 主频
- CPU 核心数

### 4. 内存信息
- 总内存
- 已使用内存
- 空闲内存
- 内存使用率（高亮显示）

#### 进程内存详情
- 堆总量（heapTotal）
- 堆使用（heapUsed）
- RSS（常驻集大小）
- 外部内存
- ArrayBuffers

## 使用方法

### 1. 启动后端服务器

确保 `tools/server` 服务已启动：

```bash
cd D:\WorkBench\ldesign\tools\server
npm run start:dev
```

后端服务默认运行在 `http://localhost:7001`

### 2. 启动前端应用

```bash
cd D:\WorkBench\ldesign\tools\web
npm run dev
```

### 3. 访问页面

在浏览器中打开前端应用，通过以下方式访问系统信息页面：

- 点击左侧菜单的"系统信息"选项
- 或直接访问路由：`http://localhost:5173/system-info`

### 4. 刷新数据

点击页面右上角的"刷新数据"按钮可以重新获取最新的系统信息。

## API 端点

```
GET http://localhost:7001/api/v1/system/info
```

返回示例：
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T13:20:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "appName": "NestJS API Server",
  "nodeVersion": "v20.19.0",
  "system": {
    "platform": "win32",
    "arch": "x64",
    "cpus": 8,
    "hostname": "YOUR-HOSTNAME",
    "type": "Windows_NT",
    "release": "10.0.26100"
  },
  "memory": {
    "total": "16.00 GB",
    "free": "8.00 GB",
    "used": "8.00 GB",
    "usagePercent": "50.00%",
    "process": {
      "heapTotal": "10.50 MB",
      "heapUsed": "8.20 MB",
      "external": "1.50 MB",
      "rss": "50.00 MB",
      "arrayBuffers": "0.50 MB"
    }
  },
  "cpu": {
    "model": "Intel(R) Core(TM) i7-XXXX CPU @ 2.60GHz",
    "speed": "2600 MHz",
    "cores": 8
  }
}
```

## 技术实现

### 文件结构

```
tools/web/
├── src/
│   ├── views/
│   │   └── SystemInfo.vue          # 系统信息页面组件
│   ├── router/
│   │   └── index.ts                 # 路由配置（已更新）
│   └── layouts/
│       └── MainLayout.vue           # 主布局（已更新菜单）
```

### 关键技术点

1. **TypeScript 类型定义**：使用 interface 定义完整的系统信息数据结构
2. **响应式数据**：使用 Vue 3 Composition API（ref, computed, onMounted）
3. **数据获取**：使用原生 Fetch API 调用后端接口
4. **错误处理**：捕获网络错误并显示友好提示
5. **加载状态**：显示加载动画和加载按钮状态
6. **数据格式化**：运行时间格式化为易读格式
7. **UI 组件**：使用 TDesign Vue Next 组件库

### 样式特点

- 响应式网格布局（Grid）
- 卡片式信息展示
- 重要数据高亮显示（如内存使用率）
- 统一的间距和配色
- 支持主题切换（继承应用主题）

## 注意事项

1. **CORS 配置**：如果遇到跨域问题，请确保后端服务器已配置 CORS
2. **服务器启动**：页面需要后端服务运行才能正常显示数据
3. **错误提示**：如果服务器未启动，页面会显示错误提示
4. **数据刷新**：点击刷新按钮可以获取实时数据

## 扩展建议

未来可以考虑添加以下功能：

1. 自动刷新功能（定时轮询）
2. 历史数据趋势图表
3. 内存和 CPU 使用率可视化
4. 导出系统信息报告
5. 系统监控告警设置
