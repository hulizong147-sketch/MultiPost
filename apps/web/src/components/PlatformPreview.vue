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
      <button class="copy-btn" @click="copyContent">
        {{ copied ? '已复制' : '复制' }}
      </button>
    </div>

    <div v-if="!content" class="empty">等待内容...</div>
    <div v-else class="card-body">
      <div class="field">
        <span class="field-label">标题 ({{ content.title.length }}/{{ config.titleMaxLength }})</span>
        <p class="field-value title">{{ content.title }}</p>
      </div>

      <div class="field" v-if="content.summary">
        <span class="field-label">摘要</span>
        <p class="field-value">{{ content.summary }}</p>
      </div>

      <div class="field">
        <span class="field-label">正文 ({{ content.body.length }}字)</span>
        <div class="field-value body" v-html="content.body" />
      </div>

      <div class="field" v-if="content.tags.length">
        <span class="field-label">话题标签</span>
        <div class="tags">
          <span v-for="tag in content.tags" :key="tag" class="tag">#{{ tag }}</span>
        </div>
      </div>

      <div v-if="content.warnings.length" class="warnings">
        <div v-for="w in content.warnings" :key="w" class="warning-item">
          ⚠ {{ w }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.platform-name {
  font-size: 14px;
  font-weight: 600;
}

.copy-btn {
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #1a1a2e;
  color: #fff;
}

.empty {
  padding: 24px;
  color: #999;
  font-size: 13px;
  text-align: center;
}

.card-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}

.field {
  margin-bottom: 12px;
}

.field-label {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-value {
  font-size: 13px;
  line-height: 1.6;
  margin-top: 4px;
}

.field-value.title {
  font-weight: 600;
  font-size: 15px;
}

.field-value.body {
  max-height: 300px;
  overflow-y: auto;
  font-size: 13px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  color: #555;
}

.warnings {
  margin-top: 8px;
  padding: 8px;
  background: #fff7e6;
  border-radius: 6px;
}

.warning-item {
  font-size: 12px;
  color: #ba7517;
}
</style>
