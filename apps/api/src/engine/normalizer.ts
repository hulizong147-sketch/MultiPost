import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import type { NormalizedContent, ImageAsset } from '@multipost/shared'

/**
 * 将 Markdown 文本解析为平台无关的 NormalizedContent
 */
export function normalize(markdown: string): NormalizedContent {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown)

  // 提取纯文本（用于摘要）
  let plainText = ''
  const images: ImageAsset[] = []
  let title = ''

  visit(tree, (node: any) => {
    // 提取标题
    if (node.type === 'heading' && node.depth === 1 && !title) {
      title = extractText(node)
    }

    // 提取图片
    if (node.type === 'image') {
      images.push({
        url: node.url || '',
        alt: node.alt || '',
      })
    }

    // 收集纯文本（用于摘要和校验）
    if (node.type === 'text') {
      plainText += node.value + ' '
    }
  })

  // 如果没有 h1，取正文首行
  if (!title) {
    const lines = plainText.trim().split('\n')
    title = lines[0]?.slice(0, 64) || '未命名'
  }

  // 生成摘要（前 200 字）
  const summary = plainText.trim().slice(0, 200)

  // 生成 HTML（用于富文本平台预览）
  let bodyHtml = markdownToSimpleHtml(markdown)

  return {
    title: title.trim(),
    bodyMarkdown: markdown,
    bodyHtml,
    images,
    tags: [],
    summary,
  }
}

function extractText(node: any): string {
  let text = ''
  visit(node, (child: any) => {
    if (child.type === 'text') {
      text += child.value
    }
  })
  return text
}

/**
 * 简易 Markdown → HTML 转换（不使用 remark-rehype 以避免重量依赖）
 * 供预览使用，后续各适配器可覆写
 */
function markdownToSimpleHtml(md: string): string {
  let html = md
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体/斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 段落（连续的纯文本行）
    .replace(/^(?!<[hl]|<li|<img|<a|<code)(.+)$/gm, '<p>$1</p>')
    // 换行
    .replace(/\n\n/g, '<br/>')

  return html
}
