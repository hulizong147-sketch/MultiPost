<script setup lang="ts">
import { watch, ref } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const content = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(content, (val) => {
  store.markdown = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (store.selectedPlatforms.length > 0 && val.trim()) {
      store.doTransform()
    }
  }, 500)
})
</script>

<template>
  <div class="editor-container">
    <div class="editor-toolbar">
      <span class="toolbar-hint">Markdown 编辑器 — 支持标题、粗体、列表等语法</span>
    </div>
    <textarea
      v-model="content"
      class="editor-textarea"
      placeholder="# 在此输入 Markdown 内容...

支持语法：
# 一级标题
## 二级标题
**粗体** *斜体*
- 无序列表
[链接](https://example.com)
> 引用
```代码块```"
    />
  </div>
</template>

<style scoped>
.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.editor-toolbar {
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
  flex-shrink: 0;
}

.toolbar-hint {
  font-size: 12px;
  color: #999;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  padding: 24px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  background: #fff;
}

.editor-textarea::placeholder {
  color: #bbb;
}
</style>
