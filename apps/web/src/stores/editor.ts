import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import { transformContent } from '../api/client'

const SAMPLE = `# 远程办公的利与弊

在数字化转型浪潮下，**远程办公**已成为越来越多企业的选择。

## 核心优势

- **时间灵活**：摆脱固定工时，工作生活更平衡
- **地域自由**：不限城市，人才池扩大 10 倍
- **成本降低**：企业节省办公场地租金

## 主要挑战

> 沟通效率下降是远程办公最大的痛点

### 协作工具推荐

1. 腾讯会议 — 视频沟通
2. 飞书 — 文档协作
3. GitHub — 代码协同

### 代码示例

\`\`\`javascript
// 远程协作 API 示例
async function syncWork() {
  const tasks = await fetch('/api/tasks')
  return tasks.filter(t => !t.completed)
}
\`\`\`

## 总结

远程办公不是万能药，需要**工具 + 制度 + 文化**三者配合。`

export const useEditorStore = defineStore('editor', () => {
  const markdown = ref('')
  const selectedPlatforms = ref<PlatformType[]>([])
  const results = ref<Record<string, PlatformContent>>({})
  const isLoading = ref(false)
  const error = ref('')

  const platforms = [
    { type: PlatformType.WECHAT_MP, label: '公众号' },
    { type: PlatformType.ZHIHU, label: '知乎' },
    { type: PlatformType.XIAOHONGSHU, label: '小红书' },
    { type: PlatformType.BILIBILI, label: 'B站' },
    { type: PlatformType.TOUTIAO, label: '头条' },
  ]

  function loadSample(editorRef: { setContent: (text: string) => void } | null) {
    if (editorRef) {
      editorRef.setContent(SAMPLE)
    }
    markdown.value = SAMPLE
    selectedPlatforms.value = platforms.map((p) => p.type)
  }

  function togglePlatform(type: PlatformType) {
    const idx = selectedPlatforms.value.indexOf(type)
    if (idx >= 0) {
      selectedPlatforms.value.splice(idx, 1)
    } else {
      selectedPlatforms.value.push(type)
    }
    if (markdown.value) {
      doTransform()
    }
  }

  async function doTransform() {
    if (!markdown.value.trim() || selectedPlatforms.value.length === 0) return

    isLoading.value = true
    error.value = ''

    try {
      const res = await transformContent({
        markdown: markdown.value,
        platforms: selectedPlatforms.value,
      })
      results.value = res.results
    } catch (e: any) {
      error.value = e.message || '转换失败'
    } finally {
      isLoading.value = false
    }
  }

  function copyAll() {
    const texts: string[] = []
    for (const p of selectedPlatforms.value) {
      const r = results.value[p]
      if (!r) continue
      const name = platforms.find((x) => x.type === p)?.label || p
      texts.push(`=== ${name} ===`)
      texts.push(r.title)
      texts.push('')
      texts.push(r.body)
      texts.push('')
    }
    navigator.clipboard.writeText(texts.join('\n'))
  }

  return {
    markdown,
    selectedPlatforms,
    results,
    isLoading,
    error,
    platforms,
    loadSample,
    togglePlatform,
    doTransform,
    copyAll,
  }
})
