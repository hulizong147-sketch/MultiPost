import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { visit } from 'unist-util-visit'
import type { NormalizedContent, ImageAsset } from '@multipost/shared'

// 扩展 sanitize schema，允许 class/id 属性（各平台适配器会进一步处理）
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className'],
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    table: [...(defaultSchema.attributes?.table || []), 'className'],
    th: [...(defaultSchema.attributes?.th || []), 'style'],
    td: [...(defaultSchema.attributes?.td || []), 'style'],
  },
}

/**
 * 将 Markdown 文本解析为平台无关的 NormalizedContent
 * 使用 remark→rehype 管道生成语义化 HTML
 */
export function normalize(markdown: string): NormalizedContent {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown)

  // 提取元数据
  let plainText = ''
  const images: ImageAsset[] = []
  let title = ''
  const headings: { level: number; text: string }[] = []

  visit(tree, (node: any) => {
    // 提取所有标题（用于生成目录结构）
    if (node.type === 'heading') {
      const text = extractText(node)
      headings.push({ level: node.depth, text })
      if (node.depth === 1 && !title) {
        title = text
      }
    }

    // 提取图片
    if (node.type === 'image') {
      images.push({
        url: node.url || '',
        alt: node.alt || '',
      })
    }

    // 收集纯文本
    if (node.type === 'text') {
      plainText += node.value + ' '
    } else if (node.type === 'code') {
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

  // 使用 remark-rehype 生成高质量语义化 HTML
  const bodyHtml = markdownToHtml(markdown)

  return {
    title: title.trim(),
    bodyMarkdown: markdown,
    bodyHtml,
    images,
    tags: [],
    summary,
  }
}

/**
 * 使用 remark→rehype 管道生成语义化 HTML
 * 相比之前的简陋正则替换，这套管道：
 * 1. 正确处理嵌套格式（粗体+斜体+链接等组合）
 * 2. 代码块自动标注语言 class（language-xxx）
 * 3. 表格生成完整 <table>/<thead>/<tbody> 结构
 * 4. 自动转义 HTML 实体
 */
function markdownToHtml(md: string): string {
  const result = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .processSync(md)

  return String(result)
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
