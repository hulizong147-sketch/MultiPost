<script setup lang="ts">
import { onMounted } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
onMounted(() => store.loadPlatforms())
</script>

<template>
  <div class="selector">
    <button
      v-for="p in store.platforms"
      :key="p.type"
      :class="['platform-btn', { active: store.selectedPlatforms.includes(p.type) }]"
      @click="store.togglePlatform(p.type)"
    >
      {{ p.name }}
    </button>
  </div>
</template>

<style scoped>
.selector { display: flex; gap: 6px; }
.platform-btn {
  padding: 6px 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
  background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.35);
  font-size: 12px; cursor: pointer; transition: all 0.25s; font-family: 'Inter', sans-serif;
}
.platform-btn:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }
.platform-btn.active { background: rgba(127,119,221,0.15); border-color: rgba(127,119,221,0.3); color: #c4bef8; }
</style>
