<script setup lang="ts">
import { computed, ref } from 'vue'
import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'

const props = defineProps<{
  platform: PlatformType
  content: PlatformContent | undefined
}>()

const copied = ref(false)
const config = computed(() => PLATFORM_CONSTRAINTS[props.platform])

const platformsMeta: Record<string, { color: string; gradient: string }> = {
  wechat_mp: { color: '#5dcf8a', gradient: 'rgba(93, 207, 138, 0.08)' },
  zhihu: { color: '#378add', gradient: 'rgba(55, 138, 221, 0.08)' },
  xiaohongshu: { color: '#ed5372', gradient: 'rgba(237, 83, 114, 0.08)' },
  bilibili: { color: '#e892b1', gradient: 'rgba(232, 146, 177, 0.08)' },
  toutiao: { color: '#d85a30', gradient: 'rgba(216, 90, 48, 0.08)' },
}

const meta = computed(() => platformsMeta[props.platform] || { color: '#7f77dd', gradient: 'rgba(127,119,221,0.08)' })

function copyContent() {
  if (!props.content) return
  const text = [props.content.title, '', props.content.body, '', props.content.tags.map((t: string) => `#${t}`).join(' ')].join('\n')
  navigator.clipboard.writeText(text).then(() => { copied.value = true; setTimeout(() => (copied.value = false), 2000) })
}
</script>

<template>
  <div class="card">
    <div class="card-header" :style="{ borderColor: meta.color + '22' }">
      <div class="platform-badge" :style="{ background: meta.gradient, borderColor: meta.color + '33' }">
        <span class="badge-dot" :style="{ background: meta.color }" />
        <span class="badge-name">{{ config.name }}</span>
      </div>
      <div class="header-meta">
        <span class="meta-chars" v-if="content">{{ content.body.length }}c</span>
        <button class="copy-btn" :class="{ copied }" @click="copyContent">
          <svg v-if="!copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="!content" class="card-empty">Awaiting content...</div>
    <div v-else class="card-body">
      <div class="field">
        <div class="field-label">
          Title
          <span class="field-limit">/ {{ config.titleMaxLength }}</span>
        </div>
        <h3 class="title-text">{{ content.title }}</h3>
      </div>

      <div class="field" v-if="content.summary">
        <div class="field-label">Summary</div>
        <p class="summary-text">{{ content.summary }}</p>
      </div>

      <div class="field">
        <div class="field-label">Body</div>
        <div class="body-text" v-html="content.body" />
      </div>

      <div class="field" v-if="content.tags.length">
        <div class="field-label">Tags</div>
        <div class="tags">
          <span v-for="tag in content.tags" :key="tag" class="tag">#{{ tag }}</span>
        </div>
      </div>

      <div v-if="content.warnings.length" class="warnings">
        <div v-for="w in content.warnings" :key="w">&#8226; {{ w }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: border-color 0.3s ease;
}

.card:hover {
  border-color: rgba(255, 255, 255, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.platform-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border: 1px solid;
  border-radius: 20px;
}

.badge-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
}

.badge-name {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-chars {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.15);
  font-variant-numeric: tabular-nums;
}

.copy-btn {
  width: 30px; height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: all 0.25s ease;
}

.copy-btn:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.6);
}

.copy-btn.copied {
  border-color: rgba(29, 158, 117, 0.3);
  color: #5dcf8a;
}

.card-empty {
  padding: 40px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.1);
  font-size: 12px;
}

.card-body {
  padding: 18px 16px;
  overflow-y: auto;
  flex: 1;
}

.field {
  margin-bottom: 20px;
}
.field:last-child { margin-bottom: 0; }

.field-label {
  font-size: 9px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.15);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 8px;
}

.field-limit {
  color: rgba(255, 255, 255, 0.08);
  letter-spacing: 0;
}

.title-text {
  font-size: 16px;
  font-weight: 500;
  color: #e8e8f2;
  line-height: 1.45;
  letter-spacing: -0.2px;
}

.summary-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.65;
}

.body-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.75;
  max-height: 260px;
  overflow-y: auto;
}

.body-text :deep(h1) { font-size: 18px; font-weight: 500; margin: 10px 0 6px; color: #e8e8f2; letter-spacing: -0.2px; }
.body-text :deep(h2) { font-size: 15px; font-weight: 500; margin: 8px 0 4px; color: #e8e8f2; }
.body-text :deep(h3) { font-size: 14px; font-weight: 500; margin: 6px 0 4px; color: #e0e0ec; }
.body-text :deep(p) { margin-bottom: 6px; }
.body-text :deep(strong) { font-weight: 500; color: rgba(255, 255, 255, 0.7); }
.body-text :deep(code) { background: rgba(127, 119, 221, 0.1); padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #a8a0f0; }
.body-text :deep(pre) { background: rgba(0, 0, 0, 0.3); padding: 14px; border-radius: 10px; overflow-x: auto; margin: 8px 0; border: 1px solid rgba(255, 255, 255, 0.04); }
.body-text :deep(pre code) { background: none; padding: 0; color: rgba(255, 255, 255, 0.45); font-size: 11px; }
.body-text :deep(blockquote) { border-left: 2px solid rgba(127, 119, 221, 0.3); padding-left: 14px; margin: 8px 0; color: rgba(255, 255, 255, 0.3); }
.body-text :deep(ul), .body-text :deep(ol) { padding-left: 18px; margin-bottom: 6px; }
.body-text :deep(li) { margin-bottom: 3px; color: rgba(255, 255, 255, 0.4); }
.body-text :deep(a) { color: #a8a0f0; text-decoration: none; }

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  transition: all 0.2s ease;
}

.tag:hover {
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.55);
}

.warnings {
  margin-top: 14px;
  padding: 10px 14px;
  background: rgba(239, 159, 39, 0.04);
  border: 1px solid rgba(239, 159, 39, 0.1);
  border-radius: 10px;
  font-size: 11px;
  color: rgba(239, 159, 39, 0.5);
  line-height: 1.6;
}
</style>
