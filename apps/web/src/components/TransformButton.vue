<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
</script>

<template>
  <button
    class="primary-btn"
    :disabled="!store.markdown.trim() || store.selectedPlatforms.length === 0"
    @click="store.doTransform()"
  >
    <span v-if="store.isLoading" class="spinner" />
    {{ store.isLoading ? 'Processing' : 'Transform' }}
  </button>
</template>

<style scoped>
.primary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 22px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #7f77dd 0%, #534ab7 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.2px;
  box-shadow: 0 2px 16px rgba(127, 119, 221, 0.25), 0 0 0 0 rgba(127, 119, 221, 0);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(127, 119, 221, 0.4), 0 0 0 4px rgba(127, 119, 221, 0.08);
}

.primary-btn:active:not(:disabled) {
  transform: translateY(0);
}

.primary-btn:disabled {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.15);
  box-shadow: none;
  cursor: not-allowed;
}

.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
