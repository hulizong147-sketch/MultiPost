import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import { transformContent } from '../api/client'

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
  ]

  function togglePlatform(type: PlatformType) {
    const idx = selectedPlatforms.value.indexOf(type)
    if (idx >= 0) {
      selectedPlatforms.value.splice(idx, 1)
    } else {
      selectedPlatforms.value.push(type)
    }
    // 自动触发转换
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

  return {
    markdown,
    selectedPlatforms,
    results,
    isLoading,
    error,
    platforms,
    togglePlatform,
    doTransform,
  }
})
