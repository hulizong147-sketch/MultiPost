import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class BilibiliAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.BILIBILI
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.BILIBILI].name

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.BILIBILI]
    const warnings: string[] = []
    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过${constraints.titleMaxLength}字限制`)
      title = title.slice(0, constraints.titleMaxLength)
    }
    const summary = content.summary.slice(0, constraints.summaryMaxLength)
    return { platform: PlatformType.BILIBILI, title, body: content.bodyHtml, tags: content.tags.slice(0, constraints.hashtagMaxCount), summary, warnings }
  }
}
