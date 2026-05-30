# MultiPost — Write once, publish everywhere

<div align="center">

**多平台内容发布工具** | 七牛云赛事参赛项目

[![Vue](https://img.shields.io/badge/Vue-3.x-4fc08d?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000?logo=fastify)](https://fastify.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff?logo=vite)](https://vitejs.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-monorepo-f69220?logo=pnpm)](https://pnpm.io/)

</div>

## 简介

很多创作者需要在**公众号、知乎、B站、小红书、今日头条**等平台同步发布内容，但每个平台的格式要求不同 — 有的要 HTML，有的只要纯文本，有的禁止外链，有的标题不超过 20 字……手动调整非常痛苦。

MultiPost 解决这个问题：**你在 Markdown 里写一次，自动转换成每个平台的专属格式**，然后一键复制或模拟发布。

## 已支持平台（5 个）

| 平台 | 格式 | 字数限制 | Markdown | 外链 | 特殊处理 |
|------|------|---------|---------|------|---------|
| 微信公众号 | HTML + WeChat Style | 标题 64 字 | ❌ | ❌ | 绿色引用边、暗色代码块、图片自适应 |
| 知乎 | HTML + Zhihu Style | 标题 100 字 | ✅ | ✅ | 蓝色引用边、代码语言标注 |
| 小红书 | 纯文本 | 正文 1000 字 | ❌ | ❌ | 智能截断（段落边界）、话题自动提取 |
| B站 | HTML + B站 Style | 标题 40 字 | ❌ | ✅ | 蓝灰引用、粉红行内代码、分割线 |
| 今日头条 | HTML | 标题 30 字 | ❌ | ❌ | 外链自动移除 |

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 9+

### 安装

```bash
git clone https://github.com/hulizong147-sketch/MultiPost.git
cd MultiPost
pnpm install
```

### 启动开发服务器

```bash
# 终端 1：后端 API（端口 3000）
pnpm --filter @multipost/api dev

# 终端 2：前端（端口 5173）
# Windows 如遇 .vite-temp 权限问题，需设环境变量：
# PowerShell: $env:VITE_CACHE_DIR = "$env:TEMP\vite\multipost"
pnpm --filter @multipost/web dev
```

打开 http://localhost:5173

### 使用

1. 点击 **Sample** 加载示例内容，或在左侧编辑器输入 Markdown
2. 点击顶部平台胶囊按钮选择目标平台
3. 右侧实时展示各平台的格式预览
4. 点击预览卡片右上角 **复制图标** 复制该平台内容
5. 或点 **Copy all** 一键复制所有平台内容

### 全自动发布（CLI）

对于 CSDN，支持真正的全自动发布（打开 Chrome → 自动填入 → 自动点击发布）：

```bash
# 在你的 Windows 终端里（不是 WorkBuddy 里）
cd D:\MultiPost

# 首次使用：先启动 Chrome 并手动登录一次
npx tsx scripts/publish.ts --platform csdn --file ./article.md

# 之后每次发布，Chrome 会自动用已保存的登录状态
pnpm publish:csdn -- ./article.md --title "文章标题"
```

**原理**：Playwright 控制本地 Chrome，持久化用户目录保存登录 Cookie。脱离 WorkBuddy 沙箱限制，在你自己的电脑上全自动操作。

## 架构

```
                    ┌─────────────────┐
                    │   CodeMirror 6   │  用户输入 Markdown
                    │   (Vue 3 + TS)   │
                    └────────┬────────┘
                             │ POST /api/transform
                             ▼
                    ┌─────────────────┐
                    │    Fastify API   │
                    │    (端口 3000)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Normalizer     │  remark → rehype 管道
                    │  (Markdown→HTML) │  语义化 HTML 生成
                    └────────┬────────┘
                             │ NormalizedContent
                    ┌────────▼────────┐
                    │  AdapterRegistry │  5 个平台适配器
                    │  ├─ WeChat       │  各平台专属转换
                    │  ├─ Zhihu        │
                    │  ├─ Xiaohongshu  │
                    │  ├─ Bilibili     │
                    │  └─ Toutiao      │
                    └────────┬────────┘
                             │ PlatformContent[]
                             ▼
                    ┌─────────────────┐
                    │  前端多栏预览     │  6 种风格卡片
                    │  (实时渲染)      │  一键复制/模拟发布
                    └─────────────────┘
```

### 扩展新平台

MultiPost 采用**适配器模式**，添加新平台只需 5 步：

1. 在 `PlatformType` 枚举中添加平台标识
2. 在 `PLATFORM_CONSTRAINTS` 中定义约束参数
3. 编写一个 30 行的适配器类（继承 `BasePlatformAdapter`）
4. 在 `AdapterRegistry` 中注册一行
5. 前端自动发现新平台（通过 `GET /api/platforms`）

详见 [EXTENDING.md](EXTENDING.md)

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/transform` | 转换 Markdown 为多平台格式 |
| `GET` | `/api/platforms` | 获取所有已注册平台元数据 |
| `GET` | `/api/health` | 健康检查 |

## 技术栈

### 前端
- **Vue 3** + TypeScript + Composition API
- **Pinia** 状态管理
- **CodeMirror 6** Markdown 编辑器（语法高亮、撤回/重做）
- **Vite 6** 构建工具

### 后端
- **Fastify 5** HTTP 框架
- **unified + remark + rehype** Markdown 处理管道
- **remark-gfm** GFM 扩展（表格、任务列表等）
- **rehype-sanitize** HTML 安全过滤

### 构建
- **pnpm** monorepo 工作空间
- **tsx** TypeScript 热重载

## 项目结构

```
MultiPost/
├── apps/
│   ├── api/src/           # 后端 Fastify
│   │   ├── engine/        # Markdown 解析管道
│   │   ├── adapters/      # 5 个平台适配器
│   │   └── routes/        # API 路由
│   └── web/src/           # 前端 Vue 3
│       ├── components/    # UI 组件
│       ├── stores/        # Pinia 状态
│       └── api/           # API 客户端
├── packages/shared/       # 共享类型
├── EXTENDING.md           # 扩展指南
└── README.md
```

## 许可证

MIT
