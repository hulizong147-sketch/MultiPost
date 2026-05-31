import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class XiaohongshuAdapter extends BasePlatformAdapter {
  readonly platformType = PlatformType.XIAOHONGSHU
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.XIAOHONGSHU].name
  readonly description = '小红书笔记，纯文本 1000 字限制，支持话题标签，不支持 Markdown'
  readonly docsUrl = 'https://www.xiaohongshu.com/'

  adapt(content: NormalizedContent): PlatformContent {
    const constraints = PLATFORM_CONSTRAINTS[PlatformType.XIAOHONGSHU]
    const warnings: string[] = []

    // 标题裁剪
    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过 ${constraints.titleMaxLength} 字限制（当前 ${title.length} 字），已自动截断`)
      title = title.slice(0, constraints.titleMaxLength)
    }

    // 正文：Markdown → 纯文本（小红书不支持任何富文本）
    let body = stripMarkdownToXhs(content.bodyMarkdown)

    // 智能截断：在句子/段落边界截断，而非硬切
    if (constraints.bodyMaxLength && body.length > constraints.bodyMaxLength) {
      const truncated = smartTruncate(body, constraints.bodyMaxLength)
      if (truncated.length < body.length) {
        warnings.push(
          `正文超过 ${constraints.bodyMaxLength} 字限制（当前 ${body.length} 字），已在段落边界智能截断至 ${truncated.length} 字`,
        )
        body = truncated
      }
    }

    // 从正文中自动提取话题标签
    const extractedTags = extractHashtags(body)
    const tags = [...new Set([...content.tags, ...extractedTags])].slice(0, constraints.hashtagMaxCount)

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

/**
 * Markdown → 小红书纯文本
 * 移除所有格式标记，保留 emoji 和换行结构
 */
function stripMarkdownToXhs(md: string): string {
  return md
    // 移除标题标记（保留文字）
    .replace(/^#{1,6}\s+/gm, '')
    // 移除粗体/斜体标记
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    // 行内代码 → 普通文字
    .replace(/`([^`]+)`/g, '$1')
    // 链接 → 仅保留文字
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 图片 → 占位
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // 引用块 → 保留文字
    .replace(/^>\s?/gm, '')
    // 列表标记
    .replace(/^[\s]*[-*+]\s+/gm, '· ')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // 移除 HTML 标签
    .replace(/<[^>]+>/g, '')
    // 清理多余空行（最多保留一个空行）
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 智能截断：在句子/段落边界截断
 * 优先在句号、感叹号、问号后截断；其次在换行处截断
 */
function smartTruncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text

  // 在 maxLen 范围内找最佳截断点
  const chunk = text.slice(0, maxLen)

  // 优先级：句末标点 > 换行 > 空格 > 硬截
  const sentenceEnd = chunk.match(/^[\s\S]*[。！？!?\n]/)
  if (sentenceEnd && sentenceEnd[0].length > maxLen * 0.6) {
    return sentenceEnd[0].trimEnd()
  }

  const newlineBreak = chunk.lastIndexOf('\n')
  if (newlineBreak > maxLen * 0.5) {
    return chunk.slice(0, newlineBreak).trimEnd()
  }

  const spaceBreak = chunk.lastIndexOf(' ')
  if (spaceBreak > maxLen * 0.5) {
    return chunk.slice(0, spaceBreak).trimEnd()
  }

  return chunk.trimEnd() + '…'
}

/**
 * 从正文中提取潜在话题标签
 * 识别模式：中文关键词、技术术语、产品名等
 */
function extractHashtags(text: string): string[] {
  const tags = new Set<string>()

  // 1. 检测已显式标记的标签（#标签 格式）
  const explicitTags = text.match(/#([^\s#]{2,20})/g)
  if (explicitTags) {
    explicitTags.forEach(t => tags.add(t.slice(1).replace(/[，。！？、,\.!\?]$/, '')))
  }

  // 2. 常见话题关键词检测
  const topicPatterns: { pattern: RegExp; tag: string }[] = [
    { pattern: /Python|Java(?:Script)?|Go\b|Rust|TypeScript|Vue|React|Node\.js|Docker|Kubernetes/gi, tag: '' },
    { pattern: /人工智能|机器学习|深度学习|AI|ChatGPT|GPT|LLM/gi, tag: 'AI' },
    { pattern: /前端|后端|全栈|架构|微服务|DevOps/gi, tag: '' },
    { pattern: /效率|工具|自动化|工作流/gi, tag: '效率工具' },
    { pattern: /小红书|抖音|B站|知乎|微信|公众号/gi, tag: '自媒体' },
  ]

  for (const { pattern, tag } of topicPatterns) {
    const matches = text.match(pattern)
    if (matches && matches.length > 0) {
      if (tag) {
        tags.add(tag)
      } else {
        // 使用具体匹配词作为标签
        matches.forEach(m => tags.add(m))
      }
    }
  }

  return Array.from(tags).slice(0, 10)
}
