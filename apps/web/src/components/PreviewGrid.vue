<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import PlatformPreview from './PlatformPreview.vue'

const store = useEditorStore()

const gridClass = computed(() => {
  const count = store.selectedPlatforms.length
  if (count === 1) return 'grid-1'
  if (count === 2) return 'grid-2'
  return 'grid-3'
})
</script>

<template>
  <div class="preview-container">
    <div v-if="store.isLoading" class="loading">转换中...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <div v-else :class="['preview-grid', gridClass]">
      <PlatformPreview
        v-for="p in store.selectedPlatforms"
        :key="p"
        :platform="p"
        :content="store.results[p]"
      />
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  height: 100%;
  padding: 16px;
}

.preview-grid {
  display: grid;
  gap: 16px;
  height: 100%;
}

.grid-1 { grid-template-columns: 1fr; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }

.loading, .error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-size: 14px;
}
.loading { color: #999; }
.error { color: #e24b4a; }
</style>
