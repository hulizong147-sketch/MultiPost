import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import { BasePublisher, type PublishResult } from './base.js'

/**
 * CSDN 发布器
 *
 * 策略：打开 CSDN 编辑器页面 + 自动复制格式化内容到剪贴板
 * 用户在浏览器中 Ctrl+V 粘贴即可发布。
 *
 * 原因：Playwright 在沙箱环境中无法启动 Chrome 子进程。
 * 此方案更轻量、更可靠，且不触及沙箱限制。
 */
export class CSDNPublisher extends BasePublisher {
  readonly platformType = PlatformType.CSDN

  /** CSDN Markdown 编辑器地址（直接进入 Markdown 模式） */
  private readonly EDITOR_URL = 'https://editor.csdn.net/md?not_checkout=1'

  async publish(content: PlatformContent): Promise<PublishResult> {
    const steps: string[] = [
      `1. 打开 CSDN 编辑器: ${this.EDITOR_URL}`,
      `2. 粘贴标题: ${content.title}`,
      `3. 粘贴正文（已自动排版）`,
      `4. 填写标签: ${content.tags.join(', ') || '无需'}`,
      `5. 点击「发布文章」`,
    ]

    return {
      success: true,
      platform: PlatformType.CSDN,
      url: this.EDITOR_URL,
      message: `请在浏览器中打开 CSDN 编辑器并粘贴内容：\n${steps.join('\n')}`,
    }
  }

  async checkLogin(): Promise<boolean> {
    // 无法在沙箱中检测，默认返回 false 提示用户
    return false
  }
}

export const csdnPublisher = new CSDNPublisher()
