import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class BilibiliAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.BILIBILI
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.BILIBILI].name

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.BILIBILI]
    const warnings: string[] = []

    // 标题裁剪
    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制，已自动截断`)
      title = title.slice(0, constraints.titleMaxLength)
    }

    // B站专栏支持富文本，使用 HTML
    const body = content.bodyHtml

    // 摘要裁剪
    let summary = content.summary
    if (summary.length > constraints.summaryMaxLength) {
      summary = summary.slice(0, constraints.summaryMaxLength)
    }

    // 话题标签
    const tags = content.tags.slice(0, constraints.hashtagMaxCount)

    return {
      platform: PlatformType.BILIBILI,
      title,
      body,
      tags,
      summary,
      warnings,
    }
  }
}
