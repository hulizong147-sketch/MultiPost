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
    <div class="bg-orb orb-1" />
    <div class="bg-orb orb-2" />
    <div class="bg-orb orb-3" />

    <header class="header">
      <div class="brand">
        <div class="logo-mark">M</div>
        <div class="brand-text">
          <h1 class="logo">MultiPost</h1>
          <span class="subtitle">Write once, publish everywhere</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="ghost-btn" @click="store.loadSample(editorRef)">Sample</button>
        <span class="divider" />
        <PlatformSelector />
        <span class="divider" />
        <TransformButton />
        <button v-if="Object.keys(store.results).length" class="ghost-btn accent" @click="store.copyAll()">
          Copy all
        </button>
      </div>
    </header>

    <main class="main">
      <aside class="editor-pane">
        <EditorPanel ref="editorRef" />
      </aside>
      <section class="preview-pane">
        <div v-if="store.selectedPlatforms.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12l3 3 5-5"/>
            </svg>
          </div>
          <p class="empty-title">Select platforms above</p>
          <p class="empty-desc">or</p>
          <button class="empty-cta" @click="store.loadSample(editorRef)">Load sample content</button>
        </div>
        <PreviewGrid v-else />
      </section>
    </main>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #08080f;
  color: #e4e4ec;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.12;
  pointer-events: none;
  z-index: 0;
}
.orb-1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, #7f77dd, transparent);
  top: -200px; right: -100px;
}
.orb-2 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #534ab7, transparent);
  bottom: -150px; left: -100px;
}
.orb-3 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #1d9e75, transparent);
  top: 40%; left: 50%;
  transform: translate(-50%, -50%);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(12, 12, 24, 0.7);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-mark {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #7f77dd 0%, #534ab7 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 4px 20px rgba(127, 119, 221, 0.3);
}

.brand-text { display: flex; flex-direction: column; gap: 1px; }

.logo {
  font-size: 20px;
  font-weight: 500;
  color: #f0f0f8;
  letter-spacing: -0.3px;
}

.subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 400;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.divider {
  width: 1px; height: 20px;
  background: rgba(255, 255, 255, 0.08);
}

.ghost-btn {
  padding: 7px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.2px;
}
.ghost-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  border-color: rgba(255, 255, 255, 0.15);
}
.ghost-btn.accent {
  border-color: rgba(127, 119, 221, 0.3);
  color: #a8a0f0;
}
.ghost-btn.accent:hover {
  background: rgba(127, 119, 221, 0.1);
  border-color: rgba(127, 119, 221, 0.5);
}

.main {
  display: flex;
  flex: 1;
  overflow: hidden;
  z-index: 1;
}

.editor-pane {
  width: 50%;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

.preview-pane {
  width: 50%;
  overflow-y: auto;
  background: transparent;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}

.empty-icon {
  color: rgba(255, 255, 255, 0.08);
  margin-bottom: 4px;
}

.empty-title {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.25);
  font-weight: 400;
}

.empty-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.12);
}

.empty-cta {
  margin-top: 8px;
  padding: 10px 24px;
  border: 1px solid rgba(127, 119, 221, 0.3);
  border-radius: 12px;
  background: rgba(127, 119, 221, 0.06);
  color: #a8a0f0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Inter', sans-serif;
}
.empty-cta:hover {
  background: rgba(127, 119, 221, 0.15);
  border-color: rgba(127, 119, 221, 0.5);
}
</style>
