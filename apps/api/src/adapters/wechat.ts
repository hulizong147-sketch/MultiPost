import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class WeChatAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.WECHAT_MP
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.WECHAT_MP].name

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.WECHAT_MP]
    const warnings: string[] = []

    // 标题裁剪
    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制（当前 ${title.length} 字），已自动截断`)
      title = title.slice(0, constraints.titleMaxLength)
    }

    // 摘要裁剪
    let summary = content.summary
    if (summary.length > constraints.summaryMaxLength) {
      summary = summary.slice(0, constraints.summaryMaxLength)
    }

    // 正文使用 HTML（微信不支持 Markdown）
    const body = content.bodyHtml

    return {
      platform: PlatformType.WECHAT_MP,
      title,
      body,
      tags: [],
      summary,
      warnings,
    }
  }

  validate(content: NormalizedContent): string[] {
    const warnings: string[] = []
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.WECHAT_MP]

    if (content.title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制`)
    }

    return warnings
  }
}
