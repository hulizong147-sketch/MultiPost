<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorView, keymap, placeholder, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const editorContainer = ref<HTMLDivElement>()
let editorView: EditorView | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  if (!editorContainer.value) return

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const content = update.state.doc.toString()
      store.markdown = content
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (store.selectedPlatforms.length > 0 && content.trim()) {
          store.doTransform()
        }
      }, 500)
    }
  })

  editorView = new EditorView({
    state: EditorState.create({
      doc: '',
      extensions: [
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        oneDark,
        lineNumbers(),
        placeholder('在此输入 Markdown...\n\n# 标题\n**粗体** *斜体*\n- 列表\n[链接](url)'),
        keymap.of(defaultKeymap),
        updateListener,
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
          '.cm-content': { padding: '20px', lineHeight: '1.8' },
          '.cm-gutters': { borderRight: '1px solid #333', backgroundColor: '#1e1e2e', color: '#666' },
        }),
      ],
    }),
    parent: editorContainer.value,
  })
})

function setContent(text: string) {
  if (!editorView) return
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
  })
}

onBeforeUnmount(() => {
  editorView?.destroy()
})

defineExpose({ setContent })
</script>

<template>
  <div class="editor-container">
    <div class="editor-toolbar">
      <span class="toolbar-hint">Markdown 编辑器</span>
      <span class="toolbar-count">{{ store.markdown.length }} 字</span>
    </div>
    <div ref="editorContainer" class="editor-cm" />
  </div>
</template>

<style scoped>
.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e2e;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #282840;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.toolbar-hint {
  font-size: 12px;
  color: #888;
}

.toolbar-count {
  font-size: 12px;
  color: #666;
}

.editor-cm {
  flex: 1;
  overflow: hidden;
}
</style>
