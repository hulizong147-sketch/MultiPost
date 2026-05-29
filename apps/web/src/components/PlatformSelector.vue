<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()

const icons: Record<string, string> = {
  wechat_mp: 'W',
  zhihu: 'Z',
  xiaohongshu: 'R',
  bilibili: 'B',
  toutiao: 'T',
}
</script>

<template>
  <div class="selector">
    <button
      v-for="p in store.platforms"
      :key="p.type"
      :class="['pill', { active: store.selectedPlatforms.includes(p.type) }]"
      @click="store.togglePlatform(p.type)"
    >
      <span class="pill-icon">{{ icons[p.type] }}</span>
      {{ p.label }}
    </button>
  </div>
</template>

<style scoped>
.selector {
  display: flex;
  gap: 4px;
}

.pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.2px;
}

.pill:hover {
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.6);
}

.pill.active {
  background: rgba(127, 119, 221, 0.15);
  border-color: rgba(127, 119, 221, 0.3);
  color: #c4bef8;
}

.pill-icon {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.pill.active .pill-icon {
  background: rgba(127, 119, 221, 0.25);
  color: #fff;
}
</style>
