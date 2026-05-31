<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useImageStore } from '../stores/images'

const store = useImageStore()
const hoverId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{ insert: [markdown: string] }>()

onMounted(() => store.load())

function triggerUpload() { fileInput.value?.click() }
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) store.upload(f).then(() => { (e.target as HTMLInputElement).value = '' })
}

function insertImage(img: { url: string; name: string }) {
  emit('insert', `![${img.name}](${img.url})`)
}
</script>

<template>
  <div class="image-panel">
    <div class="panel-header">
      <span class="panel-title">图片</span>
      <button class="btn-upload" @click="triggerUpload" :disabled="store.loading">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
    </div>

    <div class="panel-body" v-if="store.images.length">
      <div
        v-for="img in store.images"
        :key="img.id"
        class="image-item"
        @mouseenter="hoverId = img.id"
        @mouseleave="hoverId = null"
        @click="insertImage(img)"
      >
        <img :src="img.url" :alt="img.name" />
        <button v-if="hoverId === img.id" class="btn-del" @click.stop="store.remove(img.id)">×</button>
      </div>
    </div>

    <div class="panel-empty" v-else-if="!store.loading">
      拖入或上传图片
    </div>
  </div>
</template>

<style scoped>
.image-panel {
  border-top: 1px solid rgba(255,255,255,.06);
  padding: 8px 12px;
  max-height: 140px;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.panel-title {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.btn-upload {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  transition: all .15s;
}
.btn-upload:hover { background: rgba(127,119,221,.2); color: #c4bef8; }
.btn-upload:disabled { opacity: .3; cursor: default; }

.panel-body {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  align-items: center;
}
.image-item {
  flex-shrink: 0;
  width: 56px; height: 56px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  border: 1px solid rgba(255,255,255,.06);
  transition: border-color .15s;
}
.image-item:hover { border-color: #7f77dd; }
.image-item img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.btn-del {
  position: absolute; top: 2px; right: 2px;
  width: 18px; height: 18px;
  background: rgba(255,50,50,.7);
  border: none; border-radius: 50%;
  color: #fff; font-size: 12px;
  cursor: pointer; line-height: 1;
}

.panel-empty {
  font-size: 11px;
  color: #555;
  text-align: center;
  padding: 12px 0;
}
</style>
