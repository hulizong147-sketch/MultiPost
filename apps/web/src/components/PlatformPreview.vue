<script setup lang="ts">
import { computed, ref } from 'vue'
import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import { useEditorStore } from '../stores/editor'
import { useImageStore } from '../stores/images'

const props = defineProps<{ platform: PlatformType; content: PlatformContent | undefined }>()
const store = useEditorStore()
const imgStore = useImageStore()
const copied = ref(false)
const publishing = ref(false)
const published = ref(false)
const config = computed(() => PLATFORM_CONSTRAINTS[props.platform])

const isWechat = computed(() => props.platform === PlatformType.WECHAT_MP)
const isZhihu = computed(() => props.platform === PlatformType.ZHIHU)
const isXhs = computed(() => props.platform === PlatformType.XIAOHONGSHU)
const isBili = computed(() => props.platform === PlatformType.BILIBILI)
const isToutiao = computed(() => props.platform === PlatformType.TOUTIAO)
const isCsdn = computed(() => props.platform === PlatformType.CSDN)

const coverImage = computed(() => imgStore.images[0]?.url || '')

function copyContent() {
  if (!props.content) return
  const text = [props.content.title, '', props.content.body, '', props.content.tags.map(t => `#${t}`).join(' ')].join('\n')
  navigator.clipboard.writeText(text).then(() => { copied.value = true; setTimeout(() => (copied.value = false), 2000) })
}

async function doPublish() {
  if (!props.content) return
  publishing.value = true

  // 所有平台统一走后端发布（Electron 环境下 Playwright 全自动）
  try {
    await store.realPublish(props.platform)
    published.value = true
  } catch {
    await new Promise(r => setTimeout(r, 600))
    store.simulatePublish(props.platform, props.content.title)
    published.value = true
  }
  publishing.value = false
  setTimeout(() => (published.value = false), 2500)
}
</script>

<template>
  <div :class="['card', { wechat: isWechat, zhihu: isZhihu, xhs: isXhs, bili: isBili, toutiao: isToutiao, csdn: isCsdn }]">
    <!-- 统一顶栏 -->
    <div class="card-topbar">
      <span class="topbar-name">{{ config.name }}</span>
      <div class="topbar-actions">
        <span v-if="content" class="char-count">{{ content.body.length }}c</span>
        <button class="action-btn copy" :class="{ done: copied }" @click="copyContent">
          <svg v-if="!copied" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button v-if="content" class="action-btn pub" :disabled="publishing" @click="doPublish">
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

    <!-- 知乎样式 — 手机框模拟 -->
    <div v-else-if="isZhihu" class="body-zhihu">
      <div class="zh-phone">
        <div class="zh-statusbar"><span>9:41</span><span>🔋</span></div>
        <div class="zh-navbar">
          <span class="zh-back">&#8592;</span>
          <span class="zh-nav-title">知乎</span>
          <span class="zh-search">&#9906;</span>
        </div>
        <div class="zh-article">
          <h1 class="zh-heading">{{ content.title }}</h1>
          <div class="zh-meta">
            <div class="zh-avatar">{{ (store.accounts.zhihu?.username || '知')[0] }}</div>
            <div class="zh-meta-text">
              <span class="zh-author">{{ store.accounts.zhihu?.username || '匿名用户' }}</span>
              <span class="zh-time">{{ new Date().toLocaleDateString('zh-CN') }}</span>
            </div>
            <button class="zh-follow-btn">+ 关注</button>
          </div>
          <div class="zh-body" v-html="content.body" />
          <div v-if="content.tags.length" class="zh-tags">
            <span v-for="t in content.tags" :key="t" class="zh-tag">{{ t }}</span>
          </div>
          <div class="zh-footer-actions">
            <div class="zh-act">▲ {{ 100 + content.body.length }}</div>
            <div class="zh-act">▼</div>
            <div class="zh-act">💬 {{ Math.floor(content.body.length / 20) }}</div>
            <div class="zh-act">&#9733;</div>
            <div class="zh-act">↗ 分享</div>
          </div>
        </div>
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
          <img v-if="coverImage" :src="coverImage" class="xhs-cover-img" />
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

    <!-- 头条样式 -->
    <div v-else-if="isToutiao" class="body-toutiao">
      <div class="tt-head">
        <div class="tt-source">
          <span class="tt-logo">头条</span>
          <span class="tt-username">{{ store.accounts.toutiao?.username || '未设置账号' }}</span>
          <span class="tt-follow">+ 关注</span>
        </div>
      </div>
      <h1 class="tt-heading">{{ content.title }}</h1>
      <div class="tt-meta">
        <span>{{ new Date().toLocaleDateString('zh-CN') }}</span>
        <span>阅读 {{ 300 + content.body.length }}</span>
        <span>评论 {{ Math.floor(content.body.length / 15) }}</span>
      </div>
      <div class="tt-body" v-html="content.body" />
      <div v-if="content.tags.length" class="tt-tags">
        <span v-for="t in content.tags" :key="t" class="tt-tag">#{{ t }}</span>
      </div>
    </div>

    <!-- CSDN 样式 -->
    <div v-else-if="isCsdn" class="body-csdn">
      <h1 class="cs-heading">{{ content.title }}</h1>
      <div class="cs-meta">
        <span>{{ store.accounts.csdn?.username || '未设置账号' }}</span>
        <span>{{ new Date().toLocaleDateString('zh-CN') }}</span>
        <span>阅读 {{ 200 + content.body.length }}</span>
      </div>
      <div class="cs-body" v-html="content.body" />
      <div v-if="content.tags.length" class="cs-tags">
        <span v-for="t in content.tags" :key="t" class="cs-tag">{{ t }}</span>
      </div>
    </div>

    <!-- B站样式 — 手机框模拟 -->
    <div v-else-if="isBili" class="body-bili">
      <div class="bi-phone">
        <div class="bi-statusbar"><span>9:41</span><span>🔋</span></div>
        <div class="bi-navbar">
          <span class="bi-back">&#8592;</span>
          <span class="bi-nav-title">专栏</span>
          <span class="bi-more">&#8942;</span>
        </div>
        <div class="bi-article">
          <div class="bi-cover" v-if="coverImage">
            <img :src="coverImage" class="bi-cover-img" />
          </div>
          <h1 class="bi-heading">{{ content.title }}</h1>
          <div class="bi-meta">
            <div class="bi-avatar">{{ (store.accounts.bilibili?.username || 'UP')[0] }}</div>
            <div class="bi-meta-text">
              <span class="bi-author">{{ store.accounts.bilibili?.username || 'UP主' }}</span>
              <span class="bi-time">{{ new Date().toLocaleDateString('zh-CN') }}</span>
            </div>
            <button class="bi-follow-btn">+ 关注</button>
          </div>
          <div class="bi-body" v-html="content.body" />
          <div v-if="content.tags.length" class="bi-tags">
            <span v-for="t in content.tags" :key="t" class="bi-tag">{{ t }}</span>
          </div>
          <div class="bi-footer-actions">
            <div class="bi-act">👍 {{ 500 + content.body.length }}</div>
            <div class="bi-act">🪙 {{ Math.floor(content.body.length / 10) }}</div>
            <div class="bi-act">⭐ {{ Math.floor(content.body.length / 4) }}</div>
            <div class="bi-act">↗ 分享</div>
          </div>
        </div>
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

/* ===== 知乎样式 — 手机框 ===== */
.body-zhihu { padding: 10px; overflow-y: auto; flex: 1; display: flex; justify-content: center; }
.zh-phone { width: 100%; max-width: 360px; border: 3px solid #1a1a1a; border-radius: 36px; background: #fff; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,0.2); }
.zh-statusbar { display: flex; justify-content: space-between; padding: 10px 20px 4px; font-size: 10px; font-weight: 600; color: #1a1a1a; background: #fff; }
.zh-navbar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px 8px; border-bottom: 1px solid #f0f0f0; }
.zh-back { font-size: 18px; color: #06f; cursor: pointer; }
.zh-nav-title { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.zh-search { font-size: 16px; color: #8590a6; }
.zh-article { padding: 16px 16px 20px; }
.zh-heading { font-size: 17px; font-weight: 700; line-height: 1.45; margin: 0 0 10px; color: #1a1a1a; }
.zh-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #f6f6f6; }
.zh-avatar { width: 30px; height: 30px; border-radius: 50%; background: #06f; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
.zh-meta-text { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.zh-author { font-size: 12px; font-weight: 600; color: #1a1a1a; }
.zh-time { font-size: 10px; color: #999; }
.zh-follow-btn { padding: 3px 12px; border: 1px solid #06f; border-radius: 14px; background: transparent; color: #06f; font-size: 10px; cursor: pointer; }
.zh-body { font-size: 13px; color: #333; line-height: 1.85; }
.zh-body :deep(p) { margin-bottom: 10px; }
.zh-body :deep(strong) { font-weight: 600; }
.zh-body :deep(blockquote) { border-left: 3px solid #06f; padding: 4px 10px; color: #666; margin: 8px 0; background: #f8f9ff; font-size: 12px; }
.zh-body :deep(code) { background: #f6f6f6; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.zh-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.zh-tag { padding: 3px 10px; background: #f0f6ff; border-radius: 20px; font-size: 11px; color: #06f; }
.zh-footer-actions { display: flex; justify-content: space-around; align-items: center; padding: 12px 0 4px; margin-top: 14px; border-top: 1px solid #f0f0f0; }
.zh-act { font-size: 11px; color: #8590a6; display: flex; align-items: center; gap: 2px; }
.zh-act:first-child { color: #06f; font-weight: 600; }

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

.xhs-image { position: relative; height: 260px; background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #fbc2eb 100%); overflow: hidden; }
.xhs-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
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

/* ===== B站样式 — 手机框 ===== */
.body-bili { padding: 10px; overflow-y: auto; flex: 1; display: flex; justify-content: center; }
.bi-phone { width: 100%; max-width: 360px; border: 3px solid #1a1a1a; border-radius: 36px; background: #fff; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,0.2); }
.bi-statusbar { display: flex; justify-content: space-between; padding: 10px 20px 4px; font-size: 10px; font-weight: 600; color: #1a1a1a; background: #fff; }
.bi-navbar { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px 8px; background: #fb7299; }
.bi-back { font-size: 18px; color: #fff; cursor: pointer; }
.bi-nav-title { font-size: 14px; font-weight: 600; color: #fff; }
.bi-more { font-size: 18px; color: #fff; }
.bi-article { padding: 14px 16px 20px; }
.bi-cover { margin: -14px -16px 12px; height: 170px; overflow: hidden; background: linear-gradient(135deg, #fb7299, #ffb6c1); }
.bi-cover-img { width: 100%; height: 100%; object-fit: cover; }
.bi-heading { font-size: 16px; font-weight: 700; line-height: 1.45; margin: 0 0 10px; color: #18191c; }
.bi-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.bi-avatar { width: 28px; height: 28px; border-radius: 50%; background: #fb7299; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.bi-meta-text { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.bi-author { font-size: 11px; font-weight: 600; color: #18191c; }
.bi-time { font-size: 10px; color: #9499a0; }
.bi-follow-btn { padding: 3px 12px; border: none; border-radius: 14px; background: #fb7299; color: #fff; font-size: 10px; cursor: pointer; }
.bi-body { font-size: 13px; color: #18191c; line-height: 1.85; }
.bi-body :deep(p) { margin-bottom: 10px; }
.bi-body :deep(strong) { font-weight: 600; }
.bi-body :deep(code) { background: #f6f7f8; padding: 1px 5px; border-radius: 4px; font-size: 11px; color: #e45d8b; }
.bi-body :deep(pre) { background: #1a1a2e; color: #e4e4ec; padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 11px; }
.bi-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.bi-tag { padding: 3px 8px; background: #f6f7f8; border-radius: 6px; font-size: 10px; color: #9499a0; }
.bi-footer-actions { display: flex; justify-content: space-around; align-items: center; padding: 12px 0 4px; margin-top: 14px; border-top: 1px solid #f0f0f0; }
.bi-act { font-size: 11px; color: #9499a0; display: flex; align-items: center; gap: 2px; }
.bi-act:first-child { color: #fb7299; font-weight: 600; }

/* ===== 头条样式 ===== */
.body-toutiao { padding: 16px 18px; overflow-y: auto; flex: 1; background: #fff; color: #222; border-radius: 0 0 14px 14px; }
.tt-head { margin-bottom: 12px; }
.tt-source { display: flex; align-items: center; gap: 8px; }
.tt-logo { padding: 2px 8px; background: #e84142; color: #fff; border-radius: 4px; font-size: 11px; font-weight: 700; }
.tt-username { font-size: 13px; color: #666; }
.tt-follow { padding: 2px 10px; border: 1px solid #e84142; border-radius: 12px; font-size: 11px; color: #e84142; cursor: pointer; }
.tt-heading { font-size: 18px; font-weight: 700; line-height: 1.45; margin: 10px 0 8px; color: #222; }
.tt-meta { display: flex; gap: 14px; font-size: 11px; color: #999; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.tt-body { font-size: 14px; color: #333; line-height: 1.9; }
.tt-body :deep(p) { margin-bottom: 14px; }
.tt-body :deep(strong) { font-weight: 600; color: #1a1a1a; }
.tt-body :deep(blockquote) { border-left: 3px solid #e84142; padding: 6px 14px; margin: 12px 0; color: #888; background: #fffafa; }
.tt-body :deep(code) { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 12px; color: #d14; }
.tt-body :deep(pre) { background: #2d2d2d; color: #ccc; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
.tt-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.tt-tag { padding: 4px 10px; background: #fff5f5; border-radius: 4px; font-size: 11px; color: #e84142; }

/* ===== CSDN 样式 ===== */
.body-csdn { padding: 20px 18px; overflow-y: auto; flex: 1; background: #fff; color: #333; border-radius: 0 0 14px 14px; }
.cs-heading { font-size: 22px; font-weight: 700; line-height: 1.4; margin: 0 0 10px; }
.cs-meta { display: flex; gap: 14px; font-size: 12px; color: #999; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.cs-body { font-size: 14px; color: #333; line-height: 1.9; }
.cs-body :deep(p) { margin-bottom: 14px; }
.cs-body :deep(code) { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 13px; color: #c7254e; }
.cs-body :deep(pre) { background: #2d2d2d; color: #ccc; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
.cs-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.cs-tag { padding: 4px 10px; background: #fff8e1; border-radius: 4px; font-size: 11px; color: #e65100; }
</style>
