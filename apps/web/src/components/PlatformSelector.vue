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
  gap: 6px;
}

.platform-btn {
  padding: 5px 14px;
  border: 1px solid #3a3a55;
  border-radius: 6px;
  background: transparent;
  color: #888;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.platform-btn:hover {
  border-color: #7f77dd;
  color: #ccc;
}

.platform-btn.active {
  background: #7f77dd;
  color: #fff;
  border-color: #7f77dd;
}
</style>
