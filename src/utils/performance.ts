/**
 * 性能监控工具
 */

export interface PerformanceMetrics {
  /**
   * 页面加载时间（毫秒）
   */
  pageLoadTime?: number
  
  /**
   * DOM 内容加载时间（毫秒）
   */
  domContentLoadedTime?: number
  
  /**
   * 首次内容绘制时间（毫秒）
   */
  firstContentfulPaint?: number
  
  /**
   * 最大内容绘制时间（毫秒）
   */
  largestContentfulPaint?: number
  
  /**
   * 首次输入延迟（毫秒）
   */
  firstInputDelay?: number
  
  /**
   * 累积布局偏移
   */
  cumulativeLayoutShift?: number
  
  /**
   * 内存使用（MB）
   */
  memoryUsage?: number
}

/**
 * 性能监控类
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private observers: PerformanceObserver[] = []

  /**
   * 初始化性能监控
   */
  init() {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return
    }

    // 监听页面加载性能
    this.measurePageLoad()

    // 监听 Web Vitals
    this.measureWebVitals()

    // 监听内存使用
    this.measureMemoryUsage()
  }

  /**
   * 测量页面加载性能
   */
  private measurePageLoad() {
    if (document.readyState === 'complete') {
      this.calculatePageLoadMetrics()
    } else {
      window.addEventListener('load', () => {
        this.calculatePageLoadMetrics()
      })
    }
  }

  /**
   * 计算页面加载指标
   */
  private calculatePageLoadMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (navigation) {
      this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart
      this.metrics.domContentLoadedTime = navigation.domContentLoadedEventEnd - navigation.fetchStart
    }
  }

  /**
   * 测量 Web Vitals（核心网络指标）
   */
  private measureWebVitals() {
    // First Contentful Paint (FCP)
    this.observePerformance('paint', (entries) => {
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        this.metrics.firstContentfulPaint = fcpEntry.startTime
      }
    })

    // Largest Contentful Paint (LCP)
    this.observePerformance('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        this.metrics.largestContentfulPaint = lastEntry.startTime
      }
    })

    // First Input Delay (FID)
    this.observePerformance('first-input', (entries) => {
      const firstInput = entries[0]
      if (firstInput && 'processingStart' in firstInput) {
        this.metrics.firstInputDelay = (firstInput as any).processingStart - firstInput.startTime
      }
    })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    this.observePerformance('layout-shift', (entries) => {
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      this.metrics.cumulativeLayoutShift = clsValue
    })
  }

  /**
   * 观察性能条目
   */
  private observePerformance(type: string, callback: (entries: PerformanceEntry[]) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries())
      })
      
      observer.observe({ type, buffered: true })
      this.observers.push(observer)
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error)
    }
  }

  /**
   * 测量内存使用
   */
  private measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // 转换为 MB
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 记录性能指标
   */
  logMetrics() {
    console.group('📊 Performance Metrics')
    
    if (this.metrics.pageLoadTime) {
      console.log(`⏱️  Page Load Time: ${this.metrics.pageLoadTime.toFixed(2)}ms`)
    }
    
    if (this.metrics.domContentLoadedTime) {
      console.log(`📄 DOM Content Loaded: ${this.metrics.domContentLoadedTime.toFixed(2)}ms`)
    }
    
    if (this.metrics.firstContentfulPaint) {
      console.log(`🎨 First Contentful Paint: ${this.metrics.firstContentfulPaint.toFixed(2)}ms`)
    }
    
    if (this.metrics.largestContentfulPaint) {
      const lcp = this.metrics.largestContentfulPaint
      const lcpStatus = lcp < 2500 ? '✅' : lcp < 4000 ? '⚠️' : '❌'
      console.log(`🖼️  Largest Contentful Paint: ${lcp.toFixed(2)}ms ${lcpStatus}`)
    }
    
    if (this.metrics.firstInputDelay !== undefined) {
      const fid = this.metrics.firstInputDelay
      const fidStatus = fid < 100 ? '✅' : fid < 300 ? '⚠️' : '❌'
      console.log(`⚡ First Input Delay: ${fid.toFixed(2)}ms ${fidStatus}`)
    }
    
    if (this.metrics.cumulativeLayoutShift !== undefined) {
      const cls = this.metrics.cumulativeLayoutShift
      const clsStatus = cls < 0.1 ? '✅' : cls < 0.25 ? '⚠️' : '❌'
      console.log(`📐 Cumulative Layout Shift: ${cls.toFixed(4)} ${clsStatus}`)
    }
    
    if (this.metrics.memoryUsage) {
      console.log(`💾 Memory Usage: ${this.metrics.memoryUsage.toFixed(2)}MB`)
    }
    
    console.groupEnd()
  }

  /**
   * 清理观察者
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// 创建单例实例
export const performanceMonitor = new PerformanceMonitor()

/**
 * 测量函数执行时间
 */
export function measureExecutionTime<T>(
  fn: () => T,
  label: string = 'Function'
): T {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  console.log(`⏱️  ${label} took ${(end - start).toFixed(2)}ms`)
  return result
}

/**
 * 测量异步函数执行时间
 */
export async function measureAsyncExecutionTime<T>(
  fn: () => Promise<T>,
  label: string = 'Async Function'
): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  console.log(`⏱️  ${label} took ${(end - start).toFixed(2)}ms`)
  return result
}

/**
 * 性能标记
 */
export function mark(name: string) {
  performance.mark(name)
}

/**
 * 测量两个标记之间的时间
 */
export function measure(name: string, startMark: string, endMark: string) {
  try {
    performance.measure(name, startMark, endMark)
    const measure = performance.getEntriesByName(name)[0]
    console.log(`⏱️  ${name}: ${measure.duration.toFixed(2)}ms`)
    return measure.duration
  } catch (error) {
    console.warn(`Failed to measure ${name}:`, error)
    return 0
  }
}

/**
 * 清除所有性能标记
 */
export function clearMarks() {
  performance.clearMarks()
  performance.clearMeasures()
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, delay)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    
    if (now - lastCall >= delay) {
      lastCall = now
      fn.apply(this, args)
    }
  }
}

/**
 * 请求空闲回调（在浏览器空闲时执行）
 */
export function requestIdleTask(callback: () => void, options?: IdleRequestOptions) {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback, options)
  } else {
    // 降级方案
    return setTimeout(callback, 1) as any
  }
}

/**
 * 取消空闲回调
 */
export function cancelIdleTask(id: number) {
  if ('cancelIdleCallback' in window) {
    cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}
