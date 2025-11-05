/**
 * API 客户端
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface ApiClientOptions {
  baseURL: string
  timeout?: number
}

export class ApiClient {
  private baseURL: string
  private timeout: number

  constructor(options: ApiClientOptions) {
    this.baseURL = options.baseURL
    this.timeout = options.timeout || 30000
  }

  /**
   * 发送请求
   */
  private async request<T>(
    method: string,
    path: string,
    data?: any,
    options: RequestInit & { timeout?: number } = {},
  ): Promise<ApiResponse<T>> {
    // 确保路径以 / 开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = `${this.baseURL}${normalizedPath}`
    const timeout = options.timeout ?? this.timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    const { timeout: _, ...restOptions } = options

    console.log('API Request:', method, url, 'baseURL:', this.baseURL, 'path:', normalizedPath) // 调试日志

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...restOptions.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        ...restOptions,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // DELETE 请求可能返回 204 No Content，此时没有响应体
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true } as ApiResponse<T>
      }

      // 检查响应是否有内容
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json()
        return result
      }

      // 如果没有 JSON 内容，返回成功响应
      return { success: true } as ApiResponse<T>
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('API request failed:', error, 'URL:', url)
      throw error
    }
  }

  /**
   * GET 请求
   */
  async get<T>(path: string, options?: RequestInit & { params?: Record<string, any> }): Promise<ApiResponse<T>> {
    // 处理查询参数
    let finalPath = path
    if (options?.params) {
      const params = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
      const queryString = params.toString()
      if (queryString) {
        finalPath = `${path}${path.includes('?') ? '&' : '?'}${queryString}`
      }
    }
    const { params: _, ...restOptions } = options || {}
    return this.request<T>('GET', finalPath, undefined, restOptions)
  }

  /**
   * POST 请求
   */
  async post<T>(path: string, data?: any, options?: RequestInit & { timeout?: number }): Promise<ApiResponse<T>> {
    const timeout = options?.timeout ?? this.timeout
    const { timeout: _, ...restOptions } = options || {}
    return this.request<T>('POST', path, data, { ...restOptions, timeout })
  }

  /**
   * PUT 请求
   */
  async put<T>(path: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, data, options)
  }

  /**
   * DELETE 请求
   */
  async delete<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options)
  }
}

// 创建默认客户端实例
// Server设置了全局前缀 'api'，控制器路径是 'api/xxx'，所以实际路径是 /api/api/xxx
// 使用相对路径，让 Vite 代理处理（代理会把 /api/api 转发到 http://localhost:3000/api/api）
const apiBaseURL = '/api/api'
export const apiClient = new ApiClient({ baseURL: apiBaseURL })
