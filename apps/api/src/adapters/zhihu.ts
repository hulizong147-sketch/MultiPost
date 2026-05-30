import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class ZhihuAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.ZHIHU
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.ZHIHU].name
  readonly description = '知乎专栏，支持 Markdown 和 HTML，允许外链和话题标签'
  readonly docsUrl = 'https://zhuanlan.zhihu.com/write'

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.ZHIHU]
    const warnings: string[] = []

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

    // 知乎：HTML 格式（知乎编辑器支持富文本，也支持 Markdown 但推荐 HTML）
    const body = generateZhihuHtml(content.bodyMarkdown, content.bodyHtml)

    // 话题标签
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

/**
 * 知乎专用格式生成
 * 知乎支持 HTML 富文本，但有一些特殊要求：
 * - 代码块需要 language-xxx class 用于语法高亮
 * - 图片需要 data-caption 属性
 * - 引用块知乎蓝边
 */
function generateZhihuHtml(md: string, html: string): string {
  return html
    // 代码块保留语言标注（知乎的 code-prettify 用）
    // remark-rehype 已自动生成 language-xxx class，无需额外处理
    // 引用块：知乎蓝边
    .replace(/<blockquote>/g, '<blockquote style="border-left:3px solid #06f;padding:6px 14px;margin:10px 0;color:#646464;background:#f8f9ff;">')
    // 图片添加知乎兼容属性
    .replace(/<img\s/g, '<img style="max-width:100%;height:auto;margin:10px 0;" ')
    // 表格优化
    .replace(/<table>/g, '<table style="border-collapse:collapse;margin:12px 0;">')
    .replace(/<th>/g, '<th style="border:1px solid #e8e8e8;padding:8px 14px;background:#f6f8fa;font-weight:600;">')
    .replace(/<td>/g, '<td style="border:1px solid #e8e8e8;padding:8px 14px;">')
}
