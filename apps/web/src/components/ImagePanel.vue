<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useImageStore } from '../stores/images'

const store = useImageStore()
const hoverId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errMsg = ref('')
const dragOver = ref(false)

const emit = defineEmits<{ insert: [markdown: string] }>()

onMounted(() => store.load())

function triggerUpload() { fileInput.value?.click() }

async function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) await handleFile(f)
}

async function handleFile(f: File) {
  uploading.value = true; errMsg.value = ''
  try { await store.upload(f) } catch (e: any) { errMsg.value = '失败: ' + (e.message || '') }
  uploading.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault(); dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) handleFile(f)
}
function onDragOver(e: DragEvent) { e.preventDefault(); dragOver.value = true }
function onDragLeave() { dragOver.value = false }

function insertImage(img: { url: string; name: string }) {
  emit('insert', `![${img.name}](${img.url})`)
}
</script>

<template>
  <div
    class="image-panel"
    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    :class="{ dragOver }"
  >
    <div class="panel-header">
      <span class="panel-title">图片</span>
      <button class="btn-upload" @click="triggerUpload" :disabled="uploading">
        {{ uploading ? '...' : '+ 上传' }}
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
        :title="img.name"
      >
        <img :src="img.url" :alt="img.name" />
        <button v-if="hoverId === img.id" class="btn-del" @click.stop="store.remove(img.id)">x</button>
      </div>
    </div>

    <div class="panel-empty" v-else>
      {{ errMsg || '拖入图片或点「上传」' }}
    </div>
  </div>
</template>

<style scoped>
.image-panel { border-top: 1px solid rgba(255,255,255,.06); padding: 8px 12px; min-height: 72px; display: flex; flex-direction: column; }
.image-panel.dragOver { background: rgba(127,119,221,.08); border-color: #7f77dd; }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.panel-title { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
.btn-upload { display: flex; align-items: center; gap: 4px; padding: 3px 10px; background: rgba(127,119,221,.15); border: 1px solid rgba(127,119,221,.3); border-radius: 4px; color: #c4bef8; font-size: 11px; cursor: pointer; }
.btn-upload:hover { background: rgba(127,119,221,.25); }
.btn-upload:disabled { opacity: .4; cursor: default; }
.panel-body { display: flex; gap: 6px; overflow-x: auto; flex: 1; align-items: center; }
.image-item { flex-shrink: 0; width: 52px; height: 52px; border-radius: 4px; overflow: hidden; cursor: pointer; position: relative; border: 2px solid rgba(255,255,255,.06); transition: border-color .15s; }
.image-item:hover { border-color: #7f77dd; }
.image-item img { width: 100%; height: 100%; object-fit: cover; }
.btn-del { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; background: rgba(200,40,40,.8); border: none; border-radius: 50%; color: #fff; font-size: 12px; cursor: pointer; line-height: 1; }
.panel-empty { font-size: 11px; color: #555; text-align: center; padding: 12px 0; }
</style>
