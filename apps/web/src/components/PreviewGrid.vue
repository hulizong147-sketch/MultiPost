<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import PlatformPreview from './PlatformPreview.vue'

const store = useEditorStore()

const gridClass = computed(() => {
  const count = store.selectedPlatforms.length
  if (count <= 1) return 'grid-1'
  if (count === 2) return 'grid-2'
  return 'grid-3'
})
</script>

<template>
  <div class="preview-container">
    <div v-if="store.isLoading" class="loading">
      <span class="spinner" />
      转换中...
    </div>
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
  gap: 14px;
  height: 100%;
  align-items: start;
}

.grid-1 { grid-template-columns: 1fr; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 200px;
  color: #666;
  font-size: 14px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #333;
  border-top-color: #7f77dd;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #e24b4a;
  font-size: 14px;
}
</style>
