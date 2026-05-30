<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import PlatformPreview from './PlatformPreview.vue'

const store = useEditorStore()
const gridClass = computed(() => {
  const n = store.selectedPlatforms.length
  if (n <= 1) return 'g1'
  if (n === 2) return 'g2'
  if (n === 3) return 'g3'
  return 'g4'
})
</script>

<template>
  <div class="wrap">
    <div v-if="store.isLoading" class="loading"><span class="ring" />Transforming...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <TransitionGroup v-else :class="['grid', gridClass]" name="card" tag="div">
      <PlatformPreview v-for="p in store.selectedPlatforms" :key="p" :platform="p" :content="store.results[p]" />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.wrap { height: 100%; padding: 14px; overflow-y: auto; }
.grid { display: grid; gap: 12px; align-content: start; }
.g1 { grid-template-columns: 1fr; }
.g2 { grid-template-columns: 1fr 1fr; }
.g3 { grid-template-columns: 1fr 1fr 1fr; }
.g4 { grid-template-columns: 1fr 1fr; }
@media (max-width:1100px){.g3{grid-template-columns:1fr 1fr;}}
@media (max-width:780px){.g1,.g2,.g3,.g4{grid-template-columns:1fr;}}

.card-enter-active { transition: all 0.35s ease; }
.card-leave-active { transition: all 0.2s ease; }
.card-enter-from { opacity: 0; transform: translateY(10px) scale(0.97); }
.card-leave-to { opacity: 0; transform: translateY(-6px); }

.loading { display: flex; align-items: center; justify-content: center; gap: 10px; height: 200px; color: rgba(255,255,255,0.2); font-size: 13px; }
.ring { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.06); border-top-color: #7f77dd; border-radius: 50%; animation: spin 0.8s linear infinite; }
.error { display: flex; align-items: center; justify-content: center; height: 200px; color: rgba(226,75,74,0.5); font-size: 13px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
