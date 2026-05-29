<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
</script>

<template>
  <div class="selector">
    <button
      v-for="p in store.platforms"
      :key="p.type"
      :class="['platform-btn', { active: store.selectedPlatforms.includes(p.type) }]"
      @click="store.togglePlatform(p.type)"
    >
      {{ p.label }}
    </button>
  </div>
</template>

<style scoped>
.selector {
  display: flex;
  gap: 8px;
}

.platform-btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.platform-btn:hover {
  border-color: #1a1a2e;
}

.platform-btn.active {
  background: #1a1a2e;
  color: #fff;
  border-color: #1a1a2e;
}
</style>
