# MultiPost

**Write once, publish everywhere** — 一键将 Markdown 内容发布到多个主流平台。

## 功能

- **Markdown 编辑器** — 实时语法高亮，支持撤消/重做
- **5 平台格式转换** — 公众号、知乎、小红书、B站、今日头条，自动适配各平台格式
- **4 平台自动填充** — Playwright 控制 Chrome 自动填入内容（标题、正文、封面）
- **手机框预览** — 模拟各平台移动端展示效果
- **图片管理** — 拖入上传，插入编辑器或用作封面

## 支持的平台

| 平台 | 格式转换 | 自动填充 | 封面 |
|------|:---:|:---:|:---:|
| 微信公众号 | Web | Web | Web |
| 知乎 | Web | Web | 手动 |
| 小红书 | 纯文本 | Web | Web |
| B站 | Web | Web | Web |
| 今日头条 | Web | - | - |

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + CodeMirror 6 |
| 后端 | Fastify + TypeScript + tsx |
| 自动化 | Playwright（Chrome持久化用户目录） |
| 构建 | pnpm monorepo（apps/api, apps/web, packages/shared） |

## 快速开始

```bash
git clone https://github.com/hulizong147-sketch/MultiPost.git
cd MultiPost
pnpm install

# 终端1：后端
pnpm --filter @multipost/api dev

# 终端2：前端
$env:VITE_CACHE_DIR="$env:TEMP\vite\multipost"
pnpm --filter @multipost/web dev
```

打开 http://localhost:5173

## 发布流程

1. 在左侧编辑 Markdown
2. 选择目标平台
3. 右侧预览各平台格式化效果
4. 点击 **Publish** → Chrome 自动打开编辑器并填入内容
5. 手动检查后点击平台发布按钮

每个平台使用独立的 Chrome 用户目录，首次需手动扫码登录。

## 项目结构

```
apps/
├── api/src/
│   ├── publishers/    # 各平台发布器（Playwright自动化）
│   ├── adapters/      # 格式转换适配器
│   ├── engine/        # Markdown规范化引擎
│   └── routes/        # API路由
└── web/src/
    ├── components/    # Vue组件
    ├── stores/        # Pinia状态管理
    └── api/           # 前端API客户端
packages/shared/       # 共享类型定义
```

## 赛事

腾讯云开发竞赛参赛作品
