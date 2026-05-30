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
  const accounts = ref<Record<string, { username: string; accessKey: string }>>({})
  const publishHistory = ref<{ platform: string; user: string; title: string; time: string }[]>([])

  const platforms = [
    { type: PlatformType.WECHAT_MP, label: '公众号' },
    { type: PlatformType.ZHIHU, label: '知乎' },
    { type: PlatformType.XIAOHONGSHU, label: '小红书' },
    { type: PlatformType.BILIBILI, label: 'B站' },
  ]

  function loadSample(editorRef: { setContent: (text: string) => void } | null) {
    if (editorRef) editorRef.setContent(SAMPLE)
    markdown.value = SAMPLE
    selectedPlatforms.value = platforms.map(p => p.type)
  }

  function togglePlatform(type: PlatformType) {
    const idx = selectedPlatforms.value.indexOf(type)
    if (idx >= 0) selectedPlatforms.value.splice(idx, 1)
    else selectedPlatforms.value.push(type)
    if (markdown.value) doTransform()
  }

  async function doTransform() {
    if (!markdown.value.trim() || selectedPlatforms.value.length === 0) return
    isLoading.value = true; error.value = ''
    // 裁掉 base64 大图数据，避免请求体过大导致后端崩溃
    const cleanMd = markdown.value.replace(/!\[([^\]]*)\]\(data:image\/[^)]+\)/g, '![$1](https://placehold.co/400x300/e8e4ff/7f77dd?text=%F0%9F%93%B7+%E5%9B%BE%E7%89%87)
    try {
      const res = await transformContent({ markdown: cleanMd, platforms: selectedPlatforms.value })
      results.value = res.results
    } catch (e: any) { error.value = e.message || '转换失败' }
    finally { isLoading.value = false }
  }

  function copyAll() {
    const texts: string[] = []
    for (const p of selectedPlatforms.value) {
      const r = results.value[p]
      if (!r) continue
      const name = platforms.find(x => x.type === p)?.label || p
      texts.push(`=== ${name} ===`, r.title, '', r.body, '')
    }
    navigator.clipboard.writeText(texts.join('\n'))
  }

  // 从 localStorage 加载账号
  try {
    const saved = localStorage.getItem('multipost_accounts')
    if (saved) accounts.value = JSON.parse(saved)
  } catch {}

  function saveAccount(platform: string, username: string, accessKey: string) {
    accounts.value[platform] = { username, accessKey }
    localStorage.setItem('multipost_accounts', JSON.stringify(accounts.value))
  }

  function removeAccount(platform: string) {
    delete accounts.value[platform]
    localStorage.setItem('multipost_accounts', JSON.stringify(accounts.value))
  }

  function simulatePublish(platform: string, title: string) {
    const name = platforms.find(p => p.type === platform)?.label || platform
    const user = accounts.value[platform]?.username || '未设置账号'
    publishHistory.value.unshift({ platform: name, user, title, time: new Date().toLocaleString('zh-CN') })
    if (publishHistory.value.length > 50) publishHistory.value.pop()
  }

  return { markdown, selectedPlatforms, results, isLoading, error, platforms, accounts, publishHistory,
    loadSample, togglePlatform, doTransform, copyAll, saveAccount, removeAccount, simulatePublish }
})
