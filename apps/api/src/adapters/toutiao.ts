import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class ToutiaoAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.TOUTIAO
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.TOUTIAO].name

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.TOUTIAO]
    const warnings: string[] = []

    // 标题裁剪
    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制，已自动截断`)
      title = title.slice(0, constraints.titleMaxLength)
    }

    // 今日头条支持富文本
    const body = content.bodyHtml

    // 摘要
    let summary = content.summary
    if (summary.length > constraints.summaryMaxLength) {
      summary = summary.slice(0, constraints.summaryMaxLength)
    }

    // 标签
    const tags = content.tags.slice(0, constraints.hashtagMaxCount)

    return {
      platform: PlatformType.TOUTIAO,
      title,
      body,
      tags,
      summary,
      warnings,
    }
  }
}
