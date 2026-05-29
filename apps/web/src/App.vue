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
      <h1 class="logo">MultiPost</h1>
      <span class="subtitle">一次创作，多平台分发</span>
      <div class="header-actions">
        <PlatformSelector />
        <TransformButton />
      </div>
    </header>

    <main class="main">
      <div class="editor-pane">
        <EditorPanel />
      </div>
      <div class="preview-pane">
        <div v-if="store.selectedPlatforms.length === 0" class="empty-state">
          请在上方选择目标平台
        </div>
        <PreviewGrid v-else />
      </div>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.subtitle {
  font-size: 13px;
  color: #999;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}

.main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-pane {
  width: 50%;
  border-right: 1px solid #e5e5e5;
  overflow-y: auto;
}

.preview-pane {
  width: 50%;
  overflow-y: auto;
  background: #fff;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}
</style>
