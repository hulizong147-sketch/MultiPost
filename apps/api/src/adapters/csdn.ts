import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class CSDNAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.CSDN
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.CSDN].name
  readonly description = 'CSDN 技术博客，支持 Markdown，允许外链和标签'
  readonly docsUrl = 'https://mp.csdn.net/mp_blog/creation/editor'

  adapt(content: NormalizedContent): PlatformContent {
    const c = this.getConstraints()
    return {
      platform: PlatformType.CSDN,
      title: content.title.slice(0, c.titleMaxLength),
      body: content.bodyMarkdown,  // CSDN 原生支持 Markdown
      tags: content.tags.slice(0, c.hashtagMaxCount),
      summary: content.summary.slice(0, c.summaryMaxLength),
      warnings: [],
    }
  }
}
