import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import type { NormalizedContent, ImageAsset } from '@multipost/shared'

/**
 * 将 Markdown 文本解析为平台无关的 NormalizedContent
 * 使用 unified 管道：Markdown → mdast → hast → HTML
 */
export function normalize(markdown: string): NormalizedContent {
  // Step 1: 解析为 MDAST（Markdown AST）
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(markdown)

  // Step 2: 从 MDAST 提取元信息
  let plainText = ''
  const images: ImageAsset[] = []
  let title = ''
  const headings: { level: number; text: string }[] = []
  const codeBlocks: { language: string; code: string }[] = []

  visit(mdast, (node: any) => {
    // 标题
    if (node.type === 'heading') {
      const text = extractText(node)
      if (node.depth === 1 && !title) {
        title = text
      }
      headings.push({ level: node.depth, text })
    }

    // 图片
    if (node.type === 'image') {
      images.push({
        url: node.url || '',
        alt: node.alt || '',
      })
    }

    // 代码块
    if (node.type === 'code') {
      codeBlocks.push({
        language: node.lang || '',
        code: node.value || '',
      })
    }

    // 纯文本
    if (node.type === 'text') {
      plainText += node.value + ' '
    }
  })

  // 无标题时的降级
  if (!title) {
    const lines = plainText.trim().split('\n')
    title = lines[0]?.slice(0, 64) || '未命名'
  }

  // 生成摘要（前 200 字纯文本）
  const summary = plainText.trim().slice(0, 200)

  // Step 3: MDAST → HAST → HTML 字符串（标准管道）
  const bodyHtml = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .processSync(markdown)
    .toString()

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
    if (child.type === 'inlineCode') {
      text += child.value
    }
  })
  return text
}
