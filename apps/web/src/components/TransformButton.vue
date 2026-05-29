<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
</script>

<template>
  <button
    class="transform-btn"
    :disabled="!store.markdown.trim() || store.selectedPlatforms.length === 0"
    @click="store.doTransform()"
  >
    {{ store.isLoading ? '转换中...' : '转换预览' }}
  </button>
</template>

<style scoped>
.transform-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: #1a1a2e;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.transform-btn:hover:not(:disabled) {
  background: #2d2d4e;
}

.transform-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
