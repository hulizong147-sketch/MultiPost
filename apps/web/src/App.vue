<script setup lang="ts">
import { ref } from 'vue'
import EditorPanel from './components/EditorPanel.vue'
import PlatformSelector from './components/PlatformSelector.vue'
import PreviewGrid from './components/PreviewGrid.vue'
import TransformButton from './components/TransformButton.vue'
import { useEditorStore } from './stores/editor'

const store = useEditorStore()
const editorRef = ref<InstanceType<typeof EditorPanel> | null>(null)
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="brand">
        <h1 class="logo">MultiPost</h1>
        <span class="subtitle">一次创作，多平台分发</span>
      </div>
      <div class="header-actions">
        <button class="sample-btn" @click="store.loadSample(editorRef)">加载示例</button>
        <PlatformSelector />
        <TransformButton />
        <button
          v-if="Object.keys(store.results).length"
          class="copy-all-btn"
          @click="store.copyAll()"
        >
          复制全部
        </button>
      </div>
    </header>

    <main class="main">
      <aside class="editor-pane">
        <EditorPanel ref="editorRef" />
      </aside>
      <section class="preview-pane">
        <div v-if="store.selectedPlatforms.length === 0" class="empty-state">
          <div class="empty-icon">&#8593;</div>
          <p>在上方选择目标平台，或</p>
          <button class="empty-sample-btn" @click="store.loadSample(editorRef)">加载示例内容</button>
        </div>
        <PreviewGrid v-else />
      </section>
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: #16162a;
  border-bottom: 1px solid #2a2a40;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #7f77dd;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 13px;
  color: #666;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sample-btn, .copy-all-btn {
  padding: 5px 12px;
  border: 1px solid #3a3a55;
  border-radius: 6px;
  background: transparent;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.sample-btn:hover, .copy-all-btn:hover {
  border-color: #7f77dd;
  color: #ccc;
}

.copy-all-btn {
  border-color: #7f77dd;
  color: #7f77dd;
}

.main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-pane {
  width: 50%;
  border-right: 1px solid #2a2a40;
}

.preview-pane {
  width: 50%;
  overflow-y: auto;
  background: #16162a;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
}

.empty-icon {
  font-size: 32px;
  color: #333;
  margin-bottom: 4px;
}

.empty-state p {
  color: #666;
  font-size: 14px;
}

.empty-sample-btn {
  padding: 8px 20px;
  border: 1px solid #7f77dd;
  border-radius: 6px;
  background: transparent;
  color: #7f77dd;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.empty-sample-btn:hover {
  background: #7f77dd;
  color: #fff;
}
</style>
