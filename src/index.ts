/**
 * Web UI 管理界面
 *
 * 提供可编程调用的接口，用于在 CLI 或其他工具中启动前端服务
 */

// 导出可编程接口
export { startDevUI, startProdUI, startUI } from './programmatic'
export type { WebUIOptions, WebUIInstance } from './programmatic'
