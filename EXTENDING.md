# 扩展新平台指南

MultiPost 采用「适配器模式」架构，添加新平台只需 **5 个步骤**，无需改动核心代码。

## 架构概览

```
用户输入 Markdown
       │
       ▼
  normalizer.ts          ──→  NormalizedContent（平台无关中间表示）
       │                          ├── title, bodyMarkdown, bodyHtml
       │                          ├── images, tags, summary
       ▼
  BasePlatformAdapter.adapt()   ──→  PlatformContent（平台专属格式）
       │
       ▼
  前端多栏预览 + 一键复制/发布
```

每个平台适配器负责两件事：
1. **格式转换**：将 NormalizedContent 转换为该平台的专属格式
2. **约束校验**：检查内容是否符合该平台的规则（字数、外链等）

## 添加新平台的 5 个步骤

### Step 1 — 定义平台类型

编辑 `packages/shared/src/index.ts`，在 `PlatformType` 枚举中添加：

```ts
export enum PlatformType {
  // ... 已有平台 ...
  JIANSHU = 'jianxu',  // 新增
}
```

然后在 `PLATFORM_CONSTRAINTS` 中添加约束：

```ts
[PlatformType.JIANSHU]: {
  name: '简书',
  titleMaxLength: 50,
  bodyMaxLength: null,
  summaryMaxLength: 200,
  imageRatio: '16:9',
  supportMarkdown: true,
  allowExternalLinks: false,
  hashtagMaxCount: 5,
},
```

### Step 2 — 编写适配器

在 `apps/api/src/adapters/` 下新建文件，例如 `jianshu.ts`：

```ts
import { PlatformType, PLATFORM_CONSTRAINTS } from '@multipost/shared'
import type { NormalizedContent, PlatformContent } from '@multipost/shared'
import { BasePlatformAdapter } from './base.js'

export class JianshuAdapter extends BasePlatformAdapter {
  // 必须实现：平台标识
  readonly platformType = PlatformType.JIANSHU
  readonly platformName = PLATFORM_CONSTRAINTS[PlatformType.JIANSHU].name

  // 新架构要求：平台描述和文档链接（供前端展示）
  readonly description = '简书，中文写作平台，支持 Markdown'
  readonly docsUrl = 'https://www.jianshu.com/writer'

  // 必须实现：核心转换逻辑
  adapt(content: NormalizedContent): PlatformContent {
    const constraints = this.getConstraints()
    const warnings: string[] = []

    let title = content.title
    if (title.length > constraints.titleMaxLength) {
      warnings.push(`标题超过${constraints.titleMaxLength}字限制`)
      title = title.slice(0, constraints.titleMaxLength)
    }

    // 简书支持 Markdown，直接透传
    const body = content.bodyMarkdown

    // 标签
    const tags = content.tags.slice(0, constraints.hashtagMaxCount)

    return {
      platform: PlatformType.JIANSHU,
      title,
      body,
      tags,
      summary: content.summary.slice(0, constraints.summaryMaxLength),
      warnings,
    }
  }

  // 可选：自定义校验
  validate(content: NormalizedContent): string[] {
    const warnings: string[] = []
    if (content.bodyMarkdown.length < 100) {
      warnings.push('简书建议正文不少于 100 字')
    }
    return warnings
  }
}
```

### 适配器适配策略选择

根据目标平台选择合适的输出格式：

| 平台类型 | 输出格式 | 参考适配器 |
|---------|---------|-----------|
| 支持 Markdown | `content.bodyMarkdown` | `zhihu.ts` |
| 支持 HTML 富文本 | `content.bodyHtml` + inline style | `wechat.ts`, `bilibili.ts` |
| 仅纯文本 | Markdown → 纯文本 strip | `xiaohongshu.ts` |
| 禁止外链 | 正则移除 `<a>` 标签 | `toutiao.ts` |

### Step 3 — 注册适配器

编辑 `apps/api/src/adapters/registry.ts`：

```ts
import { JianshuAdapter } from './jianshu.js'

// ... 在注册区添加一行：
adapterRegistry.register(new JianshuAdapter())
```

### Step 4 — 添加前端预览卡片

编辑 `apps/web/src/components/PlatformPreview.vue`：

**a) 添加平台判断：**
```ts
const isJianshu = computed(() => props.platform === PlatformType.JIANSHU)
```

**b) 添加预览模板**（参考 B站模板，复制一份改 CSS 即可）：
```html
<div v-else-if="isJianshu" class="body-jianshu">
  <h1>{{ content.title }}</h1>
  <div v-html="content.body" />
</div>
```

**c) 添加样式**（在 `<style scoped>` 块末尾）。

### Step 5 — 验证

```bash
# 重启后端
pnpm --filter @multipost/api dev

# 验证 API
curl http://localhost:3000/api/platforms | jq '.platforms[] | select(.type=="jianxu")'

# 验证转换
curl -X POST http://localhost:3000/api/transform \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# 测试","platforms":["jianxu"]}'

# 重启前端
pnpm --filter @multipost/web dev
```

## 前端自动发现机制

完成 Step 1-3 后，**无需手动修改前端平台列表**。前端在 `onMounted` 时调用 `GET /api/platforms` 自动获取所有已注册平台及其元数据。即使后端不可用，前端也有静态兜底列表。

## AdapterRegistry API

| 方法 | 说明 |
|------|------|
| `register(adapter)` | 注册一个适配器 |
| `get(platformType)` | 获取指定平台的适配器 |
| `listAll()` | 返回所有已注册适配器 |

## BasePlatformAdapter 抽象类

| 属性/方法 | 必须实现 | 说明 |
|-----------|---------|------|
| `platformType` | ✅ | 平台类型标识 |
| `platformName` | ✅ | 平台中文名称 |
| `description` | ✅ | 平台简介（前端展示用） |
| `docsUrl` | ✅ | 平台帮助文档链接 |
| `adapt(content)` | ✅ | 核心转换逻辑 |
| `validate(content)` | ❌ | 额外校验（可覆盖） |
| `getConstraints()` | ❌ | 读取平台约束（已内置） |
| `getMeta()` | ❌ | 生成前端元数据（已内置） |

## 计划支持的平台

已完成：
- [x] 微信公众号
- [x] 知乎
- [x] 小红书
- [x] B站
- [x] 今日头条

可扩展：
- [ ] 简书
- [ ] 掘金
- [ ] CSDN
- [ ] 博客园
- [ ] 知乎视频（需要视频处理）
