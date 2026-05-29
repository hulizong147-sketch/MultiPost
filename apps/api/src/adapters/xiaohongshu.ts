import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class XiaohongshuAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.XIAOHONGSHU
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.XIAOHONGSHU].name

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.XIAOHONGSHU]
    const warnings: string[] = []

    // 标题裁剪
    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制（当前 ${title.length} 字），已自动截断`)
      title = title.slice(0, constraints.titleMaxLength)
    }

    // 正文裁剪（小红书最多 1000 字）
    let body = content.bodyMarkdown
    if (constraints.bodyMaxLength && body.length > constraints.bodyMaxLength) {
      warnings.push(
        `正文超过 ${constraints.bodyMaxLength} 字限制（当前 ${body.length} 字），已自动截断`,
      )
      body = body.slice(0, constraints.bodyMaxLength)
    }

    // 小红书不支持 Markdown → 转纯文本
    body = stripMarkdown(body)

    // 话题标签
    const tags = content.tags.slice(0, constraints.hashtagMaxCount)

    return {
      platform: PlatformType.XIAOHONGSHU,
      title,
      body,
      tags,
      summary: '',
      warnings,
    }
  }
}

function stripMarkdown(md: string): string {
  return md
    // 代码块 → 保留内容去掉标记
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, '').replace(/```/g, '')
    })
    // 行内代码
    .replace(/`([^`]+)`/g, '$1')
    // 标题
    .replace(/^#{1,6}\s/gm, '')
    // 粗体/斜体
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    // 链接
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 图片
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '[图片]')
    // 引用标记
    .replace(/^>\s?/gm, '')
    // 分隔线
    .replace(/^[-*_]{3,}$/gm, '---')
    .trim()
}
