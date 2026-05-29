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
  padding: 6px 18px;
  border: none;
  border-radius: 6px;
  background: #7f77dd;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.transform-btn:hover:not(:disabled) {
  background: #9289e8;
}

.transform-btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}
</style>
