import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class BilibiliAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.BILIBILI
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.BILIBILI].name
  readonly description = 'B站专栏，支持 HTML 富文本，允许外链和话题标签'
  readonly docsUrl = 'https://member.bilibili.com/platform/upload/text'

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.BILIBILI]
    const warnings: string[] = []

    // 标题裁剪
    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制，已自动截断`)
      title = title.slice(0, constraints.titleMaxLength)
    }

    // 摘要裁剪
    let summary = content.summary
    if (summary.length > constraints.summaryMaxLength) {
      summary = summary.slice(0, constraints.summaryMaxLength)
    }

    // B站：HTML 富文本（B站专栏支持完整 HTML）
    const body = generateBilibiliHtml(content.bodyHtml)

    // 标签（B站话题）
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

/**
 * B站专栏专用 HTML 生成
 * B站专栏编辑器支持：
 * - 完整 HTML 标签
 * - 代码高亮（language-xxx class）
 * - 图片支持 width/height 属性
 * - 支持 B站内部链接
 */
function generateBilibiliHtml(html: string): string {
  return html
    // 段落间距优化（B站阅读间距较大）
    .replace(/<p>/g, '<p style="margin-bottom:18px;line-height:1.85;font-size:15px;color:#18191c;">')
    // 标题样式（B站粉蓝色调）
    .replace(/<h1>/g, '<h1 style="font-size:22px;font-weight:700;color:#18191c;margin:22px 0 14px;">')
    .replace(/<h2>/g, '<h2 style="font-size:18px;font-weight:600;color:#18191c;margin:18px 0 12px;">')
    .replace(/<h3>/g, '<h3 style="font-size:16px;font-weight:600;color:#333;margin:14px 0 10px;">')
    // 引用块：B站蓝灰风格
    .replace(/<blockquote>/g, '<blockquote style="border-left:4px solid #00aeec;padding:8px 16px;margin:14px 0;color:#6d757a;background:#f4f9fd;">')
    // 代码块：B站深色主题
    .replace(/<pre>/g, '<pre style="background:#1a1a2e;color:#e4e4ec;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.6;">')
    .replace(/<code>/g, '<code style="background:#f6f7f8;padding:2px 6px;border-radius:4px;font-size:13px;color:#e45d8b;font-family:Consolas,Monaco,monospace;">')
    // 图片优化
    .replace(/<img\s/g, '<img style="max-width:100%;height:auto;display:block;margin:14px auto;" ')
    // 表格（B站风格）
    .replace(/<table>/g, '<table style="width:100%;border-collapse:collapse;margin:14px 0;">')
    .replace(/<th>/g, '<th style="border:1px solid #e3e5e7;padding:10px 16px;background:#f6f7f8;font-weight:600;text-align:left;">')
    .replace(/<td>/g, '<td style="border:1px solid #e3e5e7;padding:10px 16px;">')
    // 分割线
    .replace(/<hr>/g, '<hr style="border:none;border-top:1px solid #e3e5e7;margin:20px 0;">')
    // 列表项间距
    .replace(/<li>/g, '<li style="margin-bottom:4px;">')
}
