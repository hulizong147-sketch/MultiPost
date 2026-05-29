<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import PlatformPreview from './PlatformPreview.vue'

const store = useEditorStore()

const gridClass = computed(() => {
  const count = store.selectedPlatforms.length
  if (count <= 1) return 'grid-1'
  if (count === 2) return 'grid-2'
  if (count === 3) return 'grid-3'
  if (count === 4) return 'grid-4'
  return 'grid-5'
})
</script>

<template>
  <div class="preview-container">
    <div v-if="store.isLoading" class="loading-state">
      <span class="loading-ring" />
      <span class="loading-text">Transforming content for {{ store.selectedPlatforms.length }} platform{{ store.selectedPlatforms.length > 1 ? 's' : '' }}...</span>
    </div>
    <div v-else-if="store.error" class="error-state">{{ store.error }}</div>
    <TransitionGroup v-else :class="['preview-grid', gridClass]" name="card" tag="div">
      <PlatformPreview
        v-for="p in store.selectedPlatforms"
        :key="p"
        :platform="p"
        :content="store.results[p]"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.preview-container {
  height: 100%;
  padding: 20px;
}

.preview-grid {
  display: grid;
  gap: 16px;
  height: 100%;
  align-items: start;
  align-content: start;
}

.grid-1 { grid-template-columns: 1fr; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.grid-4 { grid-template-columns: 1fr 1fr; }
.grid-5 { grid-template-columns: 1fr 1fr 1fr; }

.card-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
.card-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 16px;
}

.loading-ring {
  width: 32px; height: 32px;
  border: 2px solid rgba(255, 255, 255, 0.06);
  border-top-color: #7f77dd;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.2);
  font-weight: 400;
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: rgba(226, 75, 74, 0.6);
  font-size: 13px;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
