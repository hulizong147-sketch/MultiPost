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
  padding: 8px 20px; border: none; border-radius: 8px;
  background: linear-gradient(135deg, #7f77dd, #534ab7);
  color: #fff; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 0.2s; font-family: 'Inter', sans-serif;
}
.transform-btn:hover:not(:disabled) { box-shadow: 0 4px 20px rgba(127,119,221,0.3); }
.transform-btn:disabled { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.15); cursor: not-allowed; }
</style>
