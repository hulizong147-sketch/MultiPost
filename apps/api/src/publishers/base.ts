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
   * @param content 已转换好的平台特定内容
   * @returns 发布结果
   */
  abstract publish(content: PlatformContent): Promise<PublishResult>

  /**
   * 检查登录状态（可选覆盖）
   */
  async checkLogin(): Promise<boolean> {
    return false
  }

  /**
   * 打开浏览器让用户手动登录（可选覆盖）
   */
  async openLogin(): Promise<void> {
    throw new Error(`${this.platformType} 不支持自动登录，请手动操作`)
  }
}
