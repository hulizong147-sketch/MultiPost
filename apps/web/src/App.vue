<script setup lang="ts">
import EditorPanel from './components/EditorPanel.vue'
import PlatformSelector from './components/PlatformSelector.vue'
import PreviewGrid from './components/PreviewGrid.vue'
import TransformButton from './components/TransformButton.vue'
import { useEditorStore } from './stores/editor'

const store = useEditorStore()
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="brand">
        <h1 class="logo">MultiPost</h1>
        <span class="subtitle">一次创作，多平台分发</span>
      </div>
      <div class="header-actions">
        <PlatformSelector />
        <TransformButton />
      </div>
    </header>

    <main class="main">
      <aside class="editor-pane">
        <EditorPanel />
      </aside>
      <section class="preview-pane">
        <div v-if="store.selectedPlatforms.length === 0" class="empty-state">
          <div class="empty-icon">&#8593;</div>
          <p>在上方选择目标平台</p>
          <p class="empty-hint">支持微信公众号、知乎、小红书</p>
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
  gap: 12px;
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
  gap: 8px;
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

.empty-hint {
  font-size: 12px !important;
  color: #444 !important;
}
</style>
