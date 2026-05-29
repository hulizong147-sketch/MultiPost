<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { watch, onBeforeUnmount } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: '在此输入 Markdown 内容...\n\n支持 # 标题、**加粗**、- 列表等语法',
    }),
  ],
  onUpdate: ({ editor }) => {
    const md = editor.storage.markdown?.getMarkdown?.() || editor.getText()
    store.markdown = md

    // 防抖 500ms 自动转换
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (store.selectedPlatforms.length > 0) {
        store.doTransform()
      }
    }, 500)
  },
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="editor-container">
    <div class="editor-toolbar">
      <span class="toolbar-hint">Markdown 编辑器</span>
    </div>
    <EditorContent :editor="editor" class="editor-content" />
  </div>
</template>

<style scoped>
.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
  flex-shrink: 0;
}

.toolbar-hint {
  font-size: 12px;
  color: #999;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.editor-content :deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
  font-size: 15px;
  line-height: 1.8;
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

.editor-content :deep(h1) { font-size: 24px; margin-bottom: 12px; }
.editor-content :deep(h2) { font-size: 20px; margin-bottom: 10px; }
.editor-content :deep(h3) { font-size: 17px; margin-bottom: 8px; }
.editor-content :deep(p) { margin-bottom: 8px; }
.editor-content :deep(code) { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
.editor-content :deep(pre) { background: #1a1a2e; color: #e0e0e0; padding: 16px; border-radius: 8px; overflow-x: auto; margin-bottom: 12px; }
.editor-content :deep(pre code) { background: none; padding: 0; }
.editor-content :deep(blockquote) { border-left: 3px solid #ddd; padding-left: 16px; color: #666; margin-bottom: 8px; }
.editor-content :deep(ul), .editor-content :deep(ol) { padding-left: 24px; margin-bottom: 8px; }
</style>
