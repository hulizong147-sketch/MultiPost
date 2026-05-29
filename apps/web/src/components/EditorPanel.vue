<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
        placeholder('Start writing...'),
        keymap.of(defaultKeymap),
        updateListener,
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px', backgroundColor: 'transparent' },
          '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace", padding: '8px 0' },
          '.cm-content': { padding: '32px 24px', lineHeight: '1.85', caretColor: '#7f77dd' },
          '.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.15)' },
          '.cm-activeLineGutter': { backgroundColor: 'rgba(127,119,221,0.06)' },
          '.cm-activeLine': { backgroundColor: 'rgba(127,119,221,0.04)' },
          '.cm-cursor': { borderLeftColor: '#a8a0f0' },
          '.cm-selectionBackground': { backgroundColor: 'rgba(127,119,221,0.2) !important' },
          '.cm-gutterElement': { paddingLeft: '14px', paddingRight: '8px' },
        }),
        EditorView.baseTheme({
          '&.cm-editor.cm-focused': { outline: 'none' },
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

onBeforeUnmount(() => { editorView?.destroy() })
defineExpose({ setContent })
</script>

<template>
  <div class="editor-wrap">
    <div class="editor-header">
      <div class="editor-status">
        <span class="status-dot" />
        <span class="status-label">Markdown</span>
      </div>
      <span class="char-count">{{ store.markdown.length.toLocaleString() }} chars</span>
    </div>
    <div ref="editorContainer" class="editor-body" />
    <div class="editor-footer">
      <span class="hint"># heading &middot; **bold** &middot; - list &middot; ```code```</span>
    </div>
  </div>
</template>

<style scoped>
.editor-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.editor-status { display: flex; align-items: center; gap: 8px; }

.status-dot {
  width: 7px; height: 7px;
  background: #7f77dd;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(127, 119, 221, 0.5);
}

.status-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 400;
}

.char-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.15);
  font-variant-numeric: tabular-nums;
}

.editor-body {
  flex: 1;
  overflow: hidden;
}

.editor-footer {
  padding: 10px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  flex-shrink: 0;
}

.hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.1);
  letter-spacing: 0.3px;
}
</style>
