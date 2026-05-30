import type { PlatformType, PlatformContent } from '@multipost/shared'

/**
 * 发布结果
 */
export interface PublishResult {
  success: boolean
  platform: PlatformType
  url?: string        // 发布成功后的文章链接
  message: string     // 状态描述
}

/**
 * 平台发布器抽象基类
 *
 * 每个平台的发布器负责：
 * 1. 启动/连接浏览器
 * 2. 确保登录状态
 * 3. 导航到编辑器页面
 * 4. 填入转换后的内容
 * 5. 点击发布按钮
 *
 * 使用 Playwright 控制本地 Chrome 浏览器，
 * 使用持久化 userDataDir 保持登录状态（无需存储密码）
 */
export abstract class BasePublisher {
  abstract readonly platformType: PlatformType

  /**
   * 执行发布
   */
  abstract publish(content: PlatformContent): Promise<PublishResult>

  /**
   * 等待用户在浏览器中完成登录
   *
   * 策略：先等 minWaitSec 秒（给 OAuth 跳转留时间），再轮询 URL。
   *
   * @param page Playwright Page 对象
   * @param loginKeywords URL 中包含这些关键词说明还在登录页
   * @param minWaitSec 最少等待秒数（默认 30s，处理 OAuth 跳转）
   */
  protected async waitForLogin(page: any, loginKeywords: string[], minWaitSec = 30): Promise<boolean> {
    // 先等最小时间，避免 OAuth 跳转中误判已登录
    await new Promise(r => setTimeout(r, minWaitSec * 1000))
    // 再轮询最多 5 分钟
    const maxPoll = 150
    for (let i = 0; i < maxPoll; i++) {
      try {
        const url = page.url()
        const stillOnLogin = loginKeywords.some(k => url.toLowerCase().includes(k.toLowerCase()))
        if (!stillOnLogin) return true
      } catch { /* 页面跳转中 */ }
      await new Promise(r => setTimeout(r, 2000))
    }
    return false
  }
  }

  async checkLogin(): Promise<boolean> {
    return false
  }

  async openLogin(): Promise<void> {
    throw new Error(`${this.platformType} 不支持自动登录，请手动操作`)
  }
}
