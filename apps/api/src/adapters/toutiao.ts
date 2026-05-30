import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class ToutiaoAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.TOUTIAO
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.TOUTIAO].name
  readonly description = '今日头条文章，30 字标题限制，不支持外链和 Markdown'
  readonly docsUrl = 'https://mp.toutiao.com/'

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.TOUTIAO]
    const warnings: string[] = []

    // 标题裁剪（头条标题限制 30 字，且风格偏向新闻式）
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

    // 头条使用 HTML 富文本，但禁止外链
    let body = content.bodyHtml
    // 移除外部链接（头条不允许外链），转为纯文本
    body = body.replace(/<a\s+(?:[^>]*?\s+)?href="(?!https?:\/\/www\.toutiao\.com)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '$1')

    // 话题标签（最多 3 个）
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

  validate(content: NormalizedContent): string[] {
    const warnings: string[] = []
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.TOUTIAO]

    if (content.title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制`)
    }

    // 检测外链
    const linkPattern = /\[([^\]]+)\]\((?!.*toutiao\.com)(https?:\/\/[^)]+)\)/g
    const externalLinks = [...content.bodyMarkdown.matchAll(linkPattern)]
    if (externalLinks.length > 0) {
      warnings.push(`检测到 ${externalLinks.length} 个外链，头条不允许外链，已自动移除`)
    }

    return warnings
  }
}
