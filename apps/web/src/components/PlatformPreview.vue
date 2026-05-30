<script setup lang="ts">
import { computed, ref } from 'vue'
import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import { useEditorStore } from '../stores/editor'

const props = defineProps<{
  platform: PlatformType
  content: PlatformContent | undefined
}>()

const store = useEditorStore()
const copied = ref(false)
const publishing = ref(false)
const published = ref(false)
const config = computed(() => PLATFORM_CONSTRAINTS[props.platform])

const meta: Record<string, { color: string; gradient: string }> = {
  wechat_mp: { color: '#5dcf8a', gradient: 'rgba(93,207,138,0.08)' },
  zhihu: { color: '#378add', gradient: 'rgba(55,138,221,0.08)' },
  xiaohongshu: { color: '#ed5372', gradient: 'rgba(237,83,114,0.08)' },
  bilibili: { color: '#e892b1', gradient: 'rgba(232,146,177,0.08)' },
}
const m = computed(() => meta[props.platform] || { color: '#7f77dd', gradient: 'rgba(127,119,221,0.08)' })

function copyContent() {
  if (!props.content) return
  const text = [props.content.title, '', props.content.body, '', props.content.tags.map(t => `#${t}`).join(' ')].join('\n')
  navigator.clipboard.writeText(text).then(() => { copied.value = true; setTimeout(() => (copied.value = false), 2000) })
}

async function doPublish() {
  if (!props.content) return
  publishing.value = true
  await new Promise(r => setTimeout(r, 600))
  store.simulatePublish(props.platform, props.content.title)
  published.value = true
  publishing.value = false
  setTimeout(() => (published.value = false), 2500)
}
</script>

<template>
  <div class="card">
    <div class="card-header">
      <div class="badge" :style="{ background: m.gradient, borderColor: m.color + '33' }">
        <span class="badge-dot" :style="{ background: m.color }" />
        <span class="badge-name">{{ config.name }}</span>
      </div>
      <div class="header-right">
        <span v-if="content" class="chars">{{ content.body.length }}c</span>
        <button class="copy-btn" :class="{ copied }" @click="copyContent">
          <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button v-if="store.accounts[platform]?.username" class="pub-btn" :disabled="publishing" @click="doPublish">{{ publishing ? '...' : published ? 'Done' : 'Publish' }}</button>
      </div>
    </div>

    <div v-if="!content" class="empty">Awaiting content...</div>
    <div v-else class="card-body">
      <h3 class="title-text">{{ content.title }}</h3>
      <p v-if="content.summary" class="summary-text">{{ content.summary }}</p>
      <div class="body-text" v-html="content.body" />
      <div v-if="content.tags.length" class="tags">
        <span v-for="tag in content.tags" :key="tag" class="tag">#{{ tag }}</span>
      </div>
      <div v-if="content.warnings.length" class="warnings">
        <div v-for="w in content.warnings" :key="w">&#8226; {{ w }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  display: flex; flex-direction: column; overflow: hidden;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  min-height: 0;
}
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); flex-shrink: 0;
}
.badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid; border-radius: 20px; }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.badge-name { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.75); white-space: nowrap; }
.header-right { display: flex; align-items: center; gap: 8px; }
.chars { font-size: 10px; color: rgba(255,255,255,0.15); }
.copy-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; background: transparent;
  color: rgba(255,255,255,0.25); cursor: pointer; transition: all 0.25s;
}
.copy-btn:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }
.copy-btn.copied { border-color: rgba(29,158,117,0.3); color: #5dcf8a; }

.pub-btn {
  padding: 4px 12px; border: 1px solid rgba(127,119,221,0.3); border-radius: 6px;
  background: rgba(127,119,221,0.1); color: #a8a0f0; font-size: 11px; cursor: pointer;
  font-family: 'Inter', sans-serif; transition: all 0.2s;
}
.pub-btn:hover:not(:disabled) { background: rgba(127,119,221,0.2); }
.pub-btn:disabled { opacity: 0.4; }

.empty { padding: 40px 14px; text-align: center; color: rgba(255,255,255,0.1); font-size: 12px; }

.card-body { padding: 14px; overflow-y: auto; flex: 1; min-height: 0; word-break: break-word; }
.title-text { font-size: 15px; font-weight: 500; color: #e8e8f2; line-height: 1.45; margin: 0 0 8px; }
.summary-text { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.65; margin: 0 0 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.body-text { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.75; }
.body-text :deep(h1){font-size:17px;font-weight:500;margin:6px 0 3px;color:#e8e8f2;}
.body-text :deep(h2){font-size:14px;font-weight:500;margin:5px 0 2px;color:#e0e0ec;}
.body-text :deep(p){margin-bottom:4px;}
.body-text :deep(strong){font-weight:500;color:rgba(255,255,255,0.7);}
.body-text :deep(code){background:rgba(127,119,221,0.1);padding:1px 5px;border-radius:3px;font-size:11px;color:#a8a0f0;}
.body-text :deep(pre){background:rgba(0,0,0,0.3);padding:10px 12px;border-radius:8px;overflow-x:auto;margin:5px 0;border:1px solid rgba(255,255,255,0.04);}
.body-text :deep(blockquote){border-left:2px solid rgba(127,119,221,0.3);padding-left:12px;margin:5px 0;color:rgba(255,255,255,0.3);}
.body-text :deep(ul),.body-text :deep(ol){padding-left:16px;margin-bottom:3px;}
.body-text :deep(li){margin-bottom:2px;}

.tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.04); }
.tag { padding: 3px 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; font-size: 11px; color: rgba(255,255,255,0.35); }

.warnings { margin-top: 10px; padding: 8px 12px; background: rgba(239,159,39,0.04); border: 1px solid rgba(239,159,39,0.1); border-radius: 8px; font-size: 11px; color: rgba(239,159,39,0.5); line-height: 1.5; }
</style>
