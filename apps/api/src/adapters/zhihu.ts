import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class ZhihuAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.ZHIHU
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.ZHIHU].name

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.ZHIHU]
    const warnings: string[] = []

    // 知乎保留 Markdown
    const body = content.bodyMarkdown

    // 标题裁剪
    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制，已自动截断`)
      title = title.slice(0, constraints.titleMaxLength)
    }

    // 摘要
    let summary = content.summary
    if (summary.length > constraints.summaryMaxLength) {
      summary = summary.slice(0, constraints.summaryMaxLength)
    }

    // 话题标签推荐（规则生成，后续接 AI）
    const tags = content.tags.slice(0, constraints.hashtagMaxCount)

    return {
      platform: PlatformType.ZHIHU,
      title,
      body,
      tags,
      summary,
      warnings,
    }
  }
}
