import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class WeChatAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.WECHAT_MP
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.WECHAT_MP].name
  readonly description = '微信公众平台，支持富文本 HTML，不支持 Markdown 和外链'
  readonly docsUrl = 'https://mp.weixin.qq.com/'

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

    // 正文：HTML 格式，附加微信专用样式
    const body = generateWechatHtml(content.bodyHtml)

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

    // 微信不支持外链（非微信域名）
    const hasExternalLink = /<a\s+[^>]*href="(?!https?:\/\/mp\.weixin\.qq\.com)[^"]*"/i.test(content.bodyHtml)
    if (hasExternalLink) {
      warnings.push('检测到外部链接，微信公众号正文不支持外链')
    }

    return warnings
  }
}

/**
 * 微信专用 HTML 生成
 * - 段落字号适配（微信推荐 15px-17px）
 * - 代码高亮微信兼容样式
 * - 引用块微信绿边
 * - 图片居中自适应
 */
function generateWechatHtml(html: string): string {
  return html
    // 段落样式：微信最佳阅读字号
    .replace(/<p>/g, '<p style="font-size:15px;color:#3a3a3a;line-height:1.75;margin-bottom:12px;letter-spacing:0.5px;">')
    // 标题样式
    .replace(/<h1>/g, '<h1 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:18px 0 12px;">')
    .replace(/<h2>/g, '<h2 style="font-size:17px;font-weight:600;color:#1a1a1a;margin:16px 0 10px;">')
    .replace(/<h3>/g, '<h3 style="font-size:15px;font-weight:600;color:#333;margin:14px 0 8px;">')
    // 引用块：微信特色绿边
    .replace(/<blockquote>/g, '<blockquote style="border-left:3px solid #07c160;padding:8px 14px;margin:12px 0;color:#888;font-size:14px;background:#f8faf8;">')
    // 代码块：微信兼容配色
    .replace(/<pre>/g, '<pre style="background:#282c34;color:#abb2bf;padding:14px;border-radius:6px;overflow-x:auto;font-size:13px;line-height:1.6;">')
    .replace(/<code>/g, '<code style="background:#f5f5f5;padding:2px 5px;border-radius:3px;font-size:13px;color:#c7254e;font-family:Menlo,Monaco,Consolas,monospace;">')
    // 图片自适应
    .replace(/<img\s/g, '<img style="max-width:100%;height:auto;display:block;margin:12px auto;" ')
    // 粗体强调
    .replace(/<strong>/g, '<strong style="color:#1a1a1a;">')
    // 表格
    .replace(/<table>/g, '<table style="width:100%;border-collapse:collapse;margin:12px 0;">')
    .replace(/<th>/g, '<th style="border:1px solid #e0e0e0;padding:8px 12px;background:#f5f7fa;font-weight:600;text-align:left;">')
    .replace(/<td>/g, '<td style="border:1px solid #e0e0e0;padding:8px 12px;">')
}
