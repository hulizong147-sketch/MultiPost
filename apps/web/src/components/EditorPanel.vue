<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { EditorView, keymap, placeholder, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
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
      const text = update.state.doc.toString()
      store.markdown = text
      clearTimeout(debounceTimer!)
      debounceTimer = setTimeout(() => { if (text.trim()) store.doTransform() }, 400)
    }
  })

  editorView = new EditorView({
    state: EditorState.create({
      doc: store.markdown,
      extensions: [
        history(),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        oneDark,
        lineNumbers(),
        placeholder('Start writing...'),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px', backgroundColor: 'transparent' },
          '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', 'SF Mono', monospace", padding: '8px 0' },
          '.cm-content': { padding: '32px 24px', lineHeight: '1.85', caretColor: '#7f77dd' },
          '.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.15)' },
          '.cm-activeLine': { backgroundColor: 'rgba(127,119,221,0.04)' },
          '.cm-cursor': { borderLeftColor: '#a8a0f0' },
          '.cm-selectionBackground': { backgroundColor: 'rgba(127,119,221,0.2) !important' },
        }),
        EditorView.baseTheme({ '&.cm-editor.cm-focused': { outline: 'none' } }),
      ],
    }),
    parent: editorContainer.value,
  })
})

onBeforeUnmount(() => {
  clearTimeout(debounceTimer!)
  editorView?.destroy()
})

function setContent(text: string) {
  if (!editorView) return
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
  })
}

defineExpose({ setContent })
</script>

<template>
  <div ref="editorContainer" class="editor-wrap" />
</template>

<style scoped>
.editor-wrap { height: 100%; overflow: hidden; }
</style>
