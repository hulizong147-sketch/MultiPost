<script setup lang="ts">
import { computed, ref } from 'vue'
import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import { useEditorStore } from '../stores/editor'

const props = defineProps<{ platform: PlatformType; content: PlatformContent | undefined }>()
const store = useEditorStore()
const copied = ref(false)
const publishing = ref(false)
const published = ref(false)
const config = computed(() => PLATFORM_CONSTRAINTS[props.platform])

const isWechat = computed(() => props.platform === PlatformType.WECHAT_MP)
const isZhihu = computed(() => props.platform === PlatformType.ZHIHU)
const isXhs = computed(() => props.platform === PlatformType.XIAOHONGSHU)
const isBili = computed(() => props.platform === PlatformType.BILIBILI)

function copyContent() {
  if (!props.content) return
  const text = [props.content.title, '', props.content.body, '', props.content.tags.map(t => `#${t}`).join(' ')].join('\n')
  navigator.clipboard.writeText(text).then(() => { copied.value = true; setTimeout(() => (copied.value = false), 2000) })
}

async function doPublish() {
  if (!props.content) return
  publishing.value = true
  await new Promise(r => setTimeout(r, 600))
  store.simulatePublish(props.platform, props.content.title)
  published.value = true; publishing.value = false
  setTimeout(() => (published.value = false), 2500)
}
</script>

<template>
  <div :class="['card', { wechat: isWechat, zhihu: isZhihu, xhs: isXhs, bili: isBili }]">
    <!-- 统一顶栏 -->
    <div class="card-topbar">
      <span class="topbar-name">{{ config.name }}</span>
      <div class="topbar-actions">
        <span v-if="content" class="char-count">{{ content.body.length }}c</span>
        <button class="action-btn copy" :class="{ done: copied }" @click="copyContent">
          <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button v-if="store.accounts[platform]?.username" class="action-btn pub" :disabled="publishing" @click="doPublish">
          {{ publishing ? '...' : published ? 'Done' : 'Publish' }}
        </button>
      </div>
    </div>

    <div v-if="!content" class="empty">Awaiting content...</div>

    <!-- 公众号样式：手机预览白框 -->
    <div v-else-if="isWechat" class="body-wechat">
      <div class="wx-phone">
        <div class="wx-topbar">
          <div class="wx-dots"><i /><i /><i /></div>
          <span class="wx-title">公众号文章</span>
        </div>
        <div class="wx-article">
          <h1 class="wx-heading">{{ content.title }}</h1>
          <div class="wx-meta">
            <span>{{ store.accounts.wechat_mp?.username || '未设置账号' }}</span>
            <span>{{ new Date().toLocaleDateString('zh-CN') }}</span>
          </div>
          <div class="wx-body" v-html="content.body" />
          <div class="wx-footer">
            <div class="wx-divider" />
            <div class="wx-like-row">
              <span class="wx-likes">阅读 {{ 1000 + content.body.length }}</span>
              <span class="wx-likes">赞 {{ Math.floor(content.body.length / 5) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 知乎样式 -->
    <div v-else-if="isZhihu" class="body-zhihu">
      <h1 class="zh-heading">{{ content.title }}</h1>
      <div class="zh-meta">
        <span class="zh-author">{{ store.accounts.zhihu?.username || '未设置账号' }}</span>
        <span class="zh-time">{{ new Date().toLocaleDateString('zh-CN') }}</span>
        <span class="zh-stat">👍 {{ 100 + content.body.length }}</span>
        <span class="zh-stat">💬 {{ Math.floor(content.body.length / 20) }}</span>
      </div>
      <div class="zh-body" v-html="content.body" />
      <div v-if="content.tags.length" class="zh-tags">
        <span v-for="t in content.tags" :key="t" class="zh-tag">{{ t }}</span>
      </div>
    </div>

    <!-- 小红书样式——手机框预览 -->
    <div v-else-if="isXhs" class="body-xhs">
      <div class="xhs-phone">
        <!-- 手机顶部状态栏 -->
        <div class="xhs-statusbar">
          <span>9:41</span>
          <div class="xhs-signal">
            <span class="s-bar" /><span class="s-bar" /><span class="s-bar" /><span class="s-bar" />
          </div>
        </div>
        <!-- RedNote App 头部 -->
        <div class="xhs-apphead">
          <span class="xhs-back">&larr;</span>
          <div class="xhs-avtr" />
          <span class="xhs-uname">{{ store.accounts.xiaohongshu?.username || '创作者' }}</span>
          <button class="xhs-follow">关注</button>
          <span class="xhs-share">&#8942;</span>
        </div>
        <!-- 图片区 -->
        <div class="xhs-image">
          <div class="xhs-imgdots">
            <span class="dot active" /><span class="dot" /><span class="dot" />
          </div>
        </div>
        <!-- 文案区 -->
        <div class="xhs-content">
          <h2 class="xhs-title">{{ content.title }}</h2>
          <div class="xhs-body" v-html="content.body" />
          <div v-if="content.tags.length" class="xhs-tags">
            <span v-for="t in content.tags" :key="t" class="xhs-tag">#{{ t }}</span>
          </div>
        </div>
        <!-- 底部互动栏 -->
        <div class="xhs-actions">
          <div class="xhs-act"><span class="xhs-icon">&#9825;</span> {{ 1200 + content.body.length }}</div>
          <div class="xhs-act"><span class="xhs-icon">&#9733;</span> {{ 300 + Math.floor(content.body.length / 4) }}</div>
          <div class="xhs-act"><span class="xhs-icon">&#8682;</span> {{ 80 + Math.floor(content.body.length / 10) }}</div>
          <div class="xhs-act"><span class="xhs-icon">&#9998;</span> 评论</div>
        </div>
      </div>
    </div>

    <!-- B站样式 -->
    <div v-else-if="isBili" class="body-bili">
      <h1 class="bi-heading">{{ content.title }}</h1>
      <div class="bi-meta">
        <span class="bi-author">{{ store.accounts.bilibili?.username || '未设置账号' }}</span>
        <span class="bi-time">{{ new Date().toLocaleDateString('zh-CN') }}</span>
        <span class="bi-stat">👁 {{ 500 + content.body.length }}</span>
        <span class="bi-stat">⭐ {{ Math.floor(content.body.length / 4) }}</span>
      </div>
      <div class="bi-body" v-html="content.body" />
      <div v-if="content.tags.length" class="bi-tags">
        <span v-for="t in content.tags" :key="t" class="bi-tag">{{ t }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  border-radius: 14px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.015);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  display: flex; flex-direction: column; min-height: 0;
}
.card-topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); flex-shrink: 0;
}
.topbar-name { font-size: 11px; color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 1px; }
.topbar-actions { display: flex; align-items: center; gap: 6px; }
.char-count { font-size: 10px; color: rgba(255,255,255,0.1); }
.action-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,0.06); border-radius: 7px; background: transparent;
  color: rgba(255,255,255,0.25); cursor: pointer; transition: all 0.2s;
}
.action-btn:hover { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); }
.action-btn.done { border-color: rgba(29,158,117,0.3); color: #5dcf8a; }
.action-btn.pub { width: auto; padding: 0 10px; font-size: 10px; border-color: rgba(127,119,221,0.25); color: #a8a0f0; font-family: 'Inter', sans-serif; }
.action-btn.pub:disabled { opacity: 0.3; }
.empty { padding: 40px; text-align: center; color: rgba(255,255,255,0.08); font-size: 12px; flex: 1; }

/* ===== 公众号样式 ===== */
.body-wechat { padding: 14px; display: flex; justify-content: center; overflow-y: auto; flex: 1; }
.wx-phone { width: 100%; max-width: 380px; border: 2px solid #e0e0e0; border-radius: 16px; background: #fff; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
.wx-topbar { background: #f5f5f5; padding: 8px 12px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #eee; }
.wx-dots { display: flex; gap: 5px; }
.wx-dots i { width: 7px; height: 7px; border-radius: 50%; background: #ccc; display: block; }
.wx-dots i:first-child { background: #ff5f57; }
.wx-dots i:nth-child(2) { background: #fdbc40; }
.wx-dots i:last-child { background: #33c748; }
.wx-title { font-size: 11px; color: #999; }
.wx-article { padding: 20px 16px 24px; }
.wx-heading { font-size: 17px; font-weight: 600; color: #1a1a1a; line-height: 1.45; margin: 0 0 10px; }
.wx-meta { display: flex; gap: 12px; font-size: 11px; color: #999; margin-bottom: 14px; }
.wx-body { font-size: 14px; color: #3a3a3a; line-height: 1.85; }
.wx-body :deep(p) { margin-bottom: 10px; }
.wx-body :deep(strong) { color: #1a1a1a; }
.wx-body :deep(blockquote) { border-left: 3px solid #07c160; padding-left: 12px; color: #777; margin: 10px 0; font-size: 13px; }
.wx-body :deep(code) { background: #f5f5f5; padding: 1px 4px; border-radius: 2px; font-size: 12px; color: #c7254e; }
.wx-body :deep(pre) { background: #282c34; color: #abb2bf; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; line-height: 1.5; }
.wx-footer { margin-top: 16px; }
.wx-divider { height: 1px; background: #eee; margin-bottom: 12px; }
.wx-like-row { display: flex; justify-content: space-between; font-size: 11px; color: #bbb; }

/* ===== 知乎样式 ===== */
.body-zhihu { padding: 20px 18px; overflow-y: auto; flex: 1; background: #fff; color: #1a1a1a; border-radius: 0 0 14px 14px; }
.zh-heading { font-size: 20px; font-weight: 700; line-height: 1.4; margin: 0 0 12px; color: #1a1a1a; }
.zh-meta { display: flex; gap: 14px; font-size: 12px; color: #999; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
.zh-author { font-weight: 500; color: #333; }
.zh-body { font-size: 14px; color: #333; line-height: 1.85; }
.zh-body :deep(p) { margin-bottom: 12px; }
.zh-body :deep(strong) { font-weight: 600; }
.zh-body :deep(blockquote) { border-left: 3px solid #06f; padding: 4px 12px; color: #666; margin: 10px 0; background: #f8f9ff; }
.zh-body :deep(code) { background: #f6f6f6; padding: 2px 5px; border-radius: 3px; font-size: 13px; }
.zh-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.zh-tag { padding: 4px 10px; background: #f0f6ff; border-radius: 20px; font-size: 12px; color: #06f; }

/* ===== 小红书 手机框样式 ===== */
.body-xhs { padding: 12px; overflow-y: auto; flex: 1; display: flex; justify-content: center; }
.xhs-phone {
  width: 100%; max-width: 340px;
  border: 3px solid #1a1a1a; border-radius: 36px;
  background: #fff; overflow: hidden;
  box-shadow: 0 12px 48px rgba(0,0,0,0.2);
}
.xhs-statusbar { display: flex; justify-content: space-between; padding: 8px 20px 4px; font-size: 10px; font-weight: 600; color: #1a1a1a; }
.xhs-signal { display: flex; align-items: flex-end; gap: 1px; }
.s-bar { display: block; }
.s-bar:nth-child(1) { width: 2px; height: 5px; background: #1a1a1a; border-radius: 1px; }
.s-bar:nth-child(2) { width: 2px; height: 7px; background: #1a1a1a; border-radius: 1px; }
.s-bar:nth-child(3) { width: 2px; height: 9px; background: #1a1a1a; border-radius: 1px; }
.s-bar:nth-child(4) { width: 5px; height: 11px; background: #1a1a1a; border-radius: 2px; }

.xhs-apphead { display: flex; align-items: center; gap: 8px; padding: 6px 14px 8px; }
.xhs-back { font-size: 16px; color: #333; cursor: pointer; }
.xhs-avtr { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #ff2e63, #ffb88c); flex-shrink: 0; }
.xhs-uname { font-size: 12px; font-weight: 600; color: #1a1a1a; flex: 1; }
.xhs-follow { padding: 3px 12px; border: none; border-radius: 20px; background: #ff2e63; color: #fff; font-size: 10px; font-weight: 500; cursor: pointer; }
.xhs-share { font-size: 18px; color: #666; cursor: pointer; margin-left: auto; }

.xhs-image { position: relative; height: 260px; background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #fbc2eb 100%); }
.xhs-imgdots { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; }
.xhs-imgdots .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.5); }
.xhs-imgdots .dot.active { background: #ff2e63; box-shadow: 0 0 0 3px rgba(255,46,99,0.15); }

.xhs-content { padding: 12px 14px; }
.xhs-title { font-size: 15px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px; line-height: 1.4; }
.xhs-body { font-size: 13px; color: #555; line-height: 1.75; margin-bottom: 10px; }
.xhs-body :deep(p) { margin-bottom: 8px; }
.xhs-body :deep(strong) { color: #333; font-weight: 600; }
.xhs-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.xhs-tag { padding: 3px 8px; background: #fff0f3; border-radius: 4px; font-size: 11px; color: #ff2e63; }

.xhs-actions { display: flex; justify-content: space-around; padding: 10px 14px 14px; border-top: 1px solid #f5f5f5; }
.xhs-act { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #999; }
.xhs-icon { font-size: 15px; }
.xhs-act:first-child .xhs-icon { color: #ff2e63; }
.xhs-act:nth-child(2) .xhs-icon { color: #ffb02c; }
.xhs-act:nth-child(3) .xhs-icon { color: #3b5bdb; }

/* ===== B站样式 ===== */
.body-bili { padding: 20px 18px; overflow-y: auto; flex: 1; background: #fff; color: #18191c; border-radius: 0 0 14px 14px; }
.bi-heading { font-size: 20px; font-weight: 700; line-height: 1.4; margin: 0 0 10px; }
.bi-meta { display: flex; gap: 12px; font-size: 12px; color: #9499a0; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.bi-author { color: #00aeec; }
.bi-body { font-size: 14px; color: #18191c; line-height: 1.85; }
.bi-body :deep(p) { margin-bottom: 12px; }
.bi-body :deep(strong) { font-weight: 600; }
.bi-body :deep(code) { background: #f6f7f8; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #e45d8b; }
.bi-body :deep(pre) { background: #1a1a2e; color: #e4e4ec; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
.bi-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.bi-tag { padding: 4px 10px; background: #f6f7f8; border-radius: 6px; font-size: 12px; color: #9499a0; }
</style>
