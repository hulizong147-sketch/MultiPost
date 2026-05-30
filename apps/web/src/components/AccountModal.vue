<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const emit = defineEmits<{ close: [] }>()

const editP = ref('')
const editName = ref('')
const editKey = ref('')

function openEdit(p: string) {
  editP.value = p
  editName.value = store.accounts[p]?.username || ''
  editKey.value = store.accounts[p]?.accessKey || ''
}
function save() {
  if (editName.value) store.saveAccount(editP.value, editName.value, editKey.value)
  editP.value = ''
}

const colors: Record<string, string> = { wechat_mp: '#5dcf8a', zhihu: '#378add', xiaohongshu: '#ed5372', bilibili: '#e892b1' }
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <button class="close" @click="emit('close')">&times;</button>
      <h2>Account Settings</h2>
      <p>Set your social accounts for one-click publish</p>

      <div v-for="p in store.platforms" :key="p.type" class="row">
        <div class="row-left">
          <span class="dot" :style="{ background: colors[p.type] }" />
          <span class="label">{{ p.label }}</span>
        </div>
        <div class="row-right">
          <template v-if="editP === p.type">
            <input v-model="editName" placeholder="账号名" class="inp" @keyup.enter="save" />
            <input v-model="editKey" placeholder="Access Key" class="inp" @keyup.enter="save" />
            <button class="btn save" @click="save">Save</button>
          </template>
          <template v-else-if="store.accounts[p.type]?.username">
            <span class="acct">{{ store.accounts[p.type].username }}</span>
            <button class="btn edit" @click="openEdit(p.type)">Edit</button>
            <button class="btn del" @click="store.removeAccount(p.type)">Del</button>
          </template>
          <template v-else>
            <span class="none">Not set</span>
            <button class="btn set" @click="openEdit(p.type)">Set</button>
          </template>
        </div>
      </div>

      <div v-if="store.publishHistory.length" class="history">
        <h3>Publish History</h3>
        <div v-for="(h, i) in store.publishHistory.slice(0, 10)" :key="i" class="h-item">
          <span class="h-plat">{{ h.platform }}</span>
          <span class="h-user">{{ h.user }}</span>
          <span class="h-title">{{ h.title.slice(0, 20) }}</span>
          <span class="h-time">{{ h.time }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; }
.modal { position: relative; width: 480px; max-width: 92vw; max-height: 80vh; overflow-y: auto; background: rgba(20,20,44,0.96); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 32px 28px; }
.close { position: absolute; top: 12px; right: 16px; background: none; border: none; color: rgba(255,255,255,0.3); font-size: 24px; cursor: pointer; }
h2 { font-size: 18px; color: #e8e8f2; margin: 0 0 4px; }
.modal > p { font-size: 12px; color: rgba(255,255,255,0.2); margin: 0 0 24px; }

.row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.row-left { display: flex; align-items: center; gap: 10px; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.label { font-size: 14px; color: rgba(255,255,255,0.6); }
.row-right { display: flex; align-items: center; gap: 8px; }
.acct { font-size: 13px; color: #5dcf8a; }
.none { font-size: 12px; color: rgba(255,255,255,0.12); }
.inp { padding: 6px 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; background: rgba(255,255,255,0.04); color: #e0e0e0; font-size: 12px; width: 120px; outline: none; }
.inp:focus { border-color: rgba(127,119,221,0.3); }

.btn { padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; border: 1px solid; background: transparent; font-family: 'Inter', sans-serif; }
.btn.set { border-color: rgba(127,119,221,0.2); color: #a8a0f0; }
.btn.edit { border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.3); }
.btn.del { border-color: rgba(226,75,74,0.2); color: rgba(226,75,74,0.4); }
.btn.save { border-color: rgba(29,158,117,0.2); color: #5dcf8a; }
.btn:hover { opacity: 0.8; }

.history { margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px; }
.history h3 { font-size: 13px; color: rgba(255,255,255,0.3); margin: 0 0 10px; }
.h-item { display: grid; grid-template-columns: 56px 64px 1fr auto; gap: 6px; align-items: center; padding: 6px 0; font-size: 11px; border-bottom: 1px solid rgba(255,255,255,0.02); }
.h-plat { color: #7f77dd; }
.h-user { color: rgba(255,255,255,0.3); }
.h-title { color: rgba(255,255,255,0.15); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.h-time { color: rgba(255,255,255,0.08); }
</style>
