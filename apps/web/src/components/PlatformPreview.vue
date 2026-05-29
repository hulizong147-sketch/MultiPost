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

function copyContent() {
  if (!props.content) return
  const text = [
    props.content.title,
    '',
    props.content.body,
    '',
    props.content.tags.map((t) => `#${t}`).join(' '),
  ].join('\n')

  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  })
}
</script>

<template>
  <div class="preview-card">
    <div class="card-header">
      <span class="platform-name">{{ config.name }}</span>
      <div class="card-meta">
        <span class="char-count" v-if="content">{{ content.body.length }}字</span>
        <button class="copy-btn" @click="copyContent">
          {{ copied ? '已复制' : '复制' }}
        </button>
      </div>
    </div>

    <div v-if="!content" class="empty">等待内容...</div>
    <div v-else class="card-body">
      <div class="field title-field">
        <div class="field-label">标题 <span class="limit">/{{ config.titleMaxLength }}字</span></div>
        <p class="title-text">{{ content.title }}</p>
      </div>

      <div class="field" v-if="content.summary">
        <div class="field-label">摘要</div>
        <p class="summary-text">{{ content.summary }}</p>
      </div>

      <div class="field">
        <div class="field-label">正文</div>
        <div class="body-text" v-html="content.body" />
      </div>

      <div class="field" v-if="content.tags.length">
        <div class="field-label">话题标签</div>
        <div class="tags">
          <span v-for="tag in content.tags" :key="tag" class="tag">#{{ tag }}</span>
        </div>
      </div>

      <div v-if="content.warnings.length" class="warnings">
        <div v-for="w in content.warnings" :key="w">&#9888; {{ w }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-card {
  background: #1e1e30;
  border: 1px solid #2a2a40;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #22223a;
  border-bottom: 1px solid #2a2a40;
  flex-shrink: 0;
}

.platform-name {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.char-count {
  font-size: 11px;
  color: #555;
}

.copy-btn {
  padding: 3px 10px;
  border: 1px solid #3a3a55;
  border-radius: 4px;
  background: transparent;
  color: #888;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.copy-btn:hover {
  background: #7f77dd;
  color: #fff;
  border-color: #7f77dd;
}

.empty {
  padding: 32px;
  color: #555;
  font-size: 13px;
  text-align: center;
}

.card-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}

.field {
  margin-bottom: 16px;
}

.field:last-child { margin-bottom: 0; }

.field-label {
  font-size: 10px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.limit {
  text-transform: none;
  letter-spacing: 0;
}

.title-text {
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
  line-height: 1.5;
}

.summary-text {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}

.body-text {
  font-size: 13px;
  color: #ccc;
  line-height: 1.7;
  max-height: 280px;
  overflow-y: auto;
}

.body-text :deep(h1) { font-size: 20px; margin: 8px 0 6px; color: #e0e0e0; }
.body-text :deep(h2) { font-size: 17px; margin: 8px 0 4px; color: #e0e0e0; }
.body-text :deep(h3) { font-size: 15px; margin: 6px 0 4px; color: #e0e0e0; }
.body-text :deep(p) { margin-bottom: 6px; }
.body-text :deep(strong) { color: #e0e0e0; }
.body-text :deep(code) { background: #2a2a40; padding: 2px 5px; border-radius: 3px; font-size: 12px; color: #7f77dd; }
.body-text :deep(pre) { background: #0f0f1a; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
.body-text :deep(pre code) { background: none; padding: 0; color: #ccc; font-size: 12px; }
.body-text :deep(blockquote) { border-left: 2px solid #7f77dd; padding-left: 12px; color: #888; margin: 8px 0; }
.body-text :deep(ul), .body-text :deep(ol) { padding-left: 20px; margin-bottom: 6px; }
.body-text :deep(li) { margin-bottom: 2px; }
.body-text :deep(a) { color: #7f77dd; }

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 2px 8px;
  background: #2a2a40;
  border-radius: 4px;
  font-size: 11px;
  color: #7f77dd;
}

.warnings {
  margin-top: 10px;
  padding: 8px 10px;
  background: #2a2218;
  border-radius: 6px;
  font-size: 11px;
  color: #ba7517;
  line-height: 1.6;
}
</style>
