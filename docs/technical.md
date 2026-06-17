# 心情收支簿 — 技术实现

> 面向开发者的技术细节：技术栈、项目结构、数据库、API 集成、构建部署、性能优化、安全考虑。

---

## 1. 完整技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **运行时** | Node.js | ≥18 | 开发与构建环境 |
| **框架** | React | ^18.3.1 | UI 渲染 |
| **类型系统** | TypeScript | ~5.6.2 | 类型安全 |
| **构建工具** | Vite | ^6.0.0 | 开发服务器 + 生产构建 |
| **样式方案** | Tailwind CSS | ^3.4.15 | Utility-first CSS |
| | PostCSS + autoprefixer | ^8.4.49 / ^10.4.20 | CSS 后处理 |
| **状态管理** | Zustand | ^5.0.0 | 客户端 UI 状态（侧栏/主题） |
| **数据存储** | Dexie.js | ^4.0.8 | IndexedDB 封装层 |
| | dexie-react-hooks | ^1.1.7 | React Hooks 集成 |
| **路由** | react-router-dom | ^6.28.0 | HashRouter 客户端路由 |
| **图表** | Recharts | ^2.13.0 | 所有数据可视化图表 |
| **AI 集成** | openai (OpenAI SDK) | ^4.73.0 | DeepSeek API 客户端 |
| **加密** | Web Crypto API | 浏览器内置 | AES-GCM 加密 API Key |
| **日期处理** | dayjs | ^1.11.13 | 日期格式化与计算（已安装） |
| **图标** | lucide-react | ^0.460.0 | SVG 图标库（100+ 图标） |
| **语音识别** | 百度 REST API | — | 语音转文字（含 OAuth + PCM 转换） |
| **部署** | GitHub Pages | — | 静态站点托管 |
| **CI/CD** | GitHub Actions | — | 自动构建与部署 |

---

## 2. 完整项目结构

```
Auto-Money/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions: build + deploy to Pages
├── dist/                           # 构建输出（gitignored）
├── docs/                           # 项目文档
│   ├── idea.md                     # 项目概念（心理学理论）
│   ├── design.md                   # 系统设计（架构/数据/视觉）
│   ├── technical.md                # 技术实现（本文件）
│   ├── user-guide.md               # 使用手册
│   └── changelog.md                # 版本记录
├── public/                         # 静态资源
├── resource/                       # 调研资源（论文/项目分析）
│   ├── papers/
│   └── projects/
├── src/
│   ├── main.tsx                    # 应用入口：ReactDOM + HashRouter
│   ├── App.tsx                     # 路由定义 + SpalshScreen + ParticleEffect + 快捷键
│   ├── index.css                   # 设计系统：CSS 变量 + 主题 + 组件样式
│   ├── vite-env.d.ts               # Vite 类型声明
│   │
│   ├── types/
│   │   └── index.ts                # 所有 TypeScript 类型/接口定义
│   │
│   ├── lib/
│   │   ├── constants.ts            # 常量：心情列表、类别颜色、默认设置、分类描述
│   │   ├── utils.ts                # 工具函数：ID 生成、金额格式化、日期、颜色生成
│   │   ├── icons.tsx               # Lucide 图标映射：分类图标、心情图标、导航图标、项目图标
│   │   ├── crypto.ts               # AES-GCM 加密/解密工具
│   │   └── stats.ts                # 统计计算：月汇总、分类分解、日趋势、环比
│   │
│   ├── db/
│   │   ├── index.ts                # Dexie 数据库 Schema（v8）+ 版本迁移
│   │   ├── hooks.ts                # 9 个数据表的 React Hooks（useLiveQuery）
│   │   └── seed.ts                 # 种子数据：系统分类 + 默认设置
│   │
│   ├── stores/
│   │   └── uiStore.ts             # Zustand Store：侧栏开关 + 主题切换
│   │
│   ├── services/
│   │   ├── llm.ts                  # AI 服务：4 个 LLM 调用函数
│   │   ├── speech.ts               # 语音识别：百度 API + MediaRecorder + PCM 转换
│   │   └── export.ts               # 数据导入导出：JSON/CSV
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx        # 主布局：Sidebar + Header + BottomNav + Outlet + 主题管理
│   │   │   ├── Header.tsx           # 顶部栏：标题 + 记一笔按钮
│   │   │   ├── Sidebar.tsx          # 桌面侧边栏导航
│   │   │   └── BottomNav.tsx        # 移动端底部导航栏
│   │   ├── AddModal.tsx             # 记账模态框：文字/语音/手动三合一
│   │   ├── StarJar.tsx             # 心愿星光 SVG 可视化
│   │   ├── SplashScreen.tsx        # 封面动画：物理引擎浮动图标
│   │   ├── ParticleEffect.tsx      # 点击粒子溅射效果
│   │   ├── ParticleNetwork.tsx     # Canvas 背景粒子网络
│   │   ├── Popup.tsx               # 通用弹窗组件
│   │   ├── CategoryIcon.tsx        # 分类图标组件（带背景色）
│   │   ├── EmptyState.tsx          # 空状态通用组件
│   │   └── ProjectSwitcher.tsx     # 分账单切换器
│   │
│   └── pages/
│       ├── Dashboard.tsx            # 首页：Banner + 统计 + 图表 + 日历 + 交易列表 + FAB
│       ├── AIAssistant.tsx          # AI 助手：报告/心理/对话三 Tab
│       ├── JarPage.tsx             # 心愿：心愿/冷却/成长轨道三 Tab + 重评估模态框
│       └── Settings.tsx            # 设置：API/语音/主题/预算/分类/分账单/数据
│
├── index.html                      # HTML 入口
├── package.json                    # 依赖 + 脚本
├── vite.config.ts                  # Vite 配置（base path, path alias）
├── tsconfig.json                   # TypeScript 项目引用
├── tsconfig.app.json               # 应用 TS 配置
├── tsconfig.node.json              # Node 端 TS 配置
├── tailwind.config.js              # Tailwind 配置（自定义颜色/边框/暗色模式）
├── postcss.config.js               # PostCSS 配置
└── README.md                       # 项目主页
```

---

## 3. 数据库设计

### 3.1 数据库名称

`AutoMoneyDB`（IndexedDB 数据库名）

### 3.2 版本历史

| 版本 | 迁移操作 |
|------|----------|
| v5 | 删除旧传统支出分类（餐饮、交通、购物等 31 种），保留心理学五型 |
| v7 | 二次强制清理：仅保留 5+5 核心分类，删除所有其他系统分类 |
| v8（当前） | 清理旧心理学收入分类（劳动收入、增值收入、馈赠收入、惊喜收入、回流收入），迁移到传统五分类 |

每次版本升级时：
1. 重新声明所有表的索引结构
2. 执行 `.upgrade()` 回调进行数据清理
3. 种子数据 `seedDatabase()` 在应用启动时补全缺失的系统分类

### 3.3 9 个表及索引

```
transactions (id, date, type, categoryId, projectId, mood)
├── id: 主键 (UUID)
├── date: 按日期查询/过滤
├── type: 按收支类型过滤
├── categoryId: 按分类过滤
├── projectId: 按分账单过滤
└── mood: 按心情过滤

categories (id, type)
├── id: 主键 (UUID)
└── type: 按收支类型过滤

budgets (id, categoryId, yearMonth)
├── id: 主键 (UUID)
├── categoryId: 按分类过滤
└── yearMonth: 按月查询

settings (id)
└── id: 主键 ('default')

chatMessages (id, timestamp)
├── id: 主键 (UUID)
└── timestamp: 按时间排序

projects (id)
└── id: 主键 (UUID)

jarGoals (id)
└── id: 主键 (UUID)

coolDownEvents (id, goalId, status, cooldownEndsAt, createdAt)
├── id: 主键 (UUID)
├── goalId: 按心愿过滤
├── status: 按状态过滤
├── cooldownEndsAt: 定时检查到期事件
└── createdAt: 按创建时间排序

deficits (id, yearMonth, status)
├── id: 主键 (UUID)
├── yearMonth: 按月查询
└── status: 按状态过滤
```

### 3.4 Dexie.js 使用说明

**数据库初始化：**
```typescript
// src/db/index.ts
class AutoMoneyDB extends Dexie {
  transactions!: Table<Transaction, string>
  // ... 其余 8 个表声明 ...
  constructor() {
    super('AutoMoneyDB')
    this.version(8).stores({ /* 索引声明 */ }).upgrade(/* 迁移回调 */)
  }
}
export const db = new AutoMoneyDB()
```

**React Hooks 集成（dexie-react-hooks）：**
```typescript
// useLiveQuery 自动订阅数据变更
const transactions = useLiveQuery(() =>
  db.transactions.orderBy('date').reverse().toArray()
) ?? []
```

**CRUD 操作：**
- `db.table.add(item)` — 插入
- `db.table.update(key, changes)` — 更新
- `db.table.delete(key)` — 删除
- `db.table.toArray()` — 查询全部
- `db.table.get(key)` — 按主键查询
- `db.table.where(key).equals(value).toArray()` — 条件查询
- `db.table.bulkPut(items)` — 批量插入/更新
- `db.table.clear()` — 清空表

**排序：** 使用 `orderBy()` 和 `reverse()`

**过滤：** 使用 `filter()` 或在 JS 层面进行

---

## 4. AI 集成详解

### 4.1 端点配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `apiBaseUrl` | `https://api.deepseek.com/v1` | OpenAI 兼容 API 端点 |
| `model` | `deepseek-chat` | 模型名称，可替换 |
| `apiKey` | 用户输入 | AES-GCM 加密存储 |

### 4.2 客户端创建

```typescript
async function getClient(): Promise<OpenAI | null> {
  const settings = await db.settings.get('default')
  if (!settings?.apiKey) return null
  const apiKey = await decryptApiKey(settings.apiKey)
  if (!apiKey) return null
  return new OpenAI({
    apiKey,
    baseURL: settings.apiBaseUrl || 'https://api.deepseek.com/v1',
    dangerouslyAllowBrowser: true, // 浏览器端调用（非生产环境推荐）
  })
}
```

### 4.3 4 个 AI 函数

#### parseTransaction(text: string): Promise\<ParsedTransaction\>

**用途：** 自然语言 → 结构化记账数据

**System Prompt 设计：**
- 消费五型分类体系（含详细定义和判断关键词）
- 收入五分类
- 心情推断（8 种，从情绪关键词推断）
- 日期处理（默认今天）
- 金额处理（多金额求和）
- 仅返回 JSON

**参数：**
- `temperature`: 0.1（低温度确保输出稳定可解析）
- `messages`: system prompt + user input

**输出格式：**
```json
{
  "type": "expense",
  "amount": 35,
  "category": "必要消费",
  "date": "2026-06-17",
  "description": "午餐",
  "mood": "calm",
  "confidence": 0.95
}
```

**容错：** 使用正则 `/\{[\s\S]*\}/` 从响应中提取 JSON，即使 AI 多返回了说明文字也能正常解析

#### generateReport(transactionsSummary, budgetSummary, periodType, periodLabel): Promise\<string\>

**用途：** 生成月度/周度财务报告

**System Prompt 设计：**
- 温暖记账助手的角色
- 输出 Markdown 格式
- 包含 5 个部分：总体评价 → 收支概览 → 支出排行 Top 3 → 预算执行 → 建议

**参数：**
- `temperature`: 0.7（较高温度让报告更自然）
- 上下文数据作为系统消息

#### chatQuery(userMessage, dataContext): Promise\<string\>

**用途：** 带数据上下文的自由对话

**System Prompt 设计：**
- Auto Money 智能记账助手角色
- 包含当前月度的数据概览作为上下文
- 规则：只基于提供的数据回答、回答简洁（2-5 句）、语气友好

**参数：**
- `temperature`: 0.5

#### analyzeCalmEvent(description, amount): Promise\<CoolDownAIAnalysis\>

**用途：** 消费冲动心理分析

**System Prompt 设计：**
- 消费心理学分析助手角色
- 冲动类型判断（10+ 个风险因素维度）
- 渴望程度 1-5 / 必要性 1-5
- 冷却时长建议算法（24h 小额 → 72h 中额 → 168h 大额）
- 反思问题生成
- 仅返回 JSON

**参数：**
- `temperature`: 0.3

### 4.4 API Key 安全

**存储：** AES-GCM 256 位加密
```typescript
// 加密流程
1. 生成/获取加密密钥（存储于 localStorage）
2. crypto.subtle.encrypt({ name: 'AES-GCM', iv: 12字节随机 }, key, text)
3. 返回 { iv: number[], data: number[] } 序列化为 JSON 字符串
4. 存储到 IndexedDB settings.apiKey

// 解密流程
1. 从 IndexedDB 读取 JSON 字符串
2. JSON.parse 还原 { iv, data }
3. crypto.subtle.decrypt → TextDecoder.decode → 明文 API Key
```

**降级处理：** 如果解密失败（老数据或明文存储），`decryptApiKey` 的 catch 分支直接返回原始值，保证向后兼容。

**注意：** `dangerouslyAllowBrowser: true` 意味着 API Key 在浏览器端暴露。这是因为纯静态站点没有后端代理。用户需自行承担 API Key 泄露风险。

---

## 5. 语音识别实现

### 5.1 技术流程

```
用户点击录音按钮
     │
     ▼
navigator.mediaDevices.getUserMedia({ audio: true })
     │
     ▼
MediaRecorder → audio/webm (opus codec 优先)
     │
     ▼
用户点击停止 → onstop 回调
     │
     ├─ getBaiduToken(): OAuth 2.0 获取 access_token
     │   ├─ 检查 localStorage 缓存 (expires 前 1 小时视为有效)
     │   └─ 过期则重新请求: fetch → client_credentials grant
     │       └─ 缓存: { token, expires: now + (expires_in - 3600) * 1000 }
     │
     ├─ blobToPCM(): Web Audio API 转换
     │   ├─ blob.arrayBuffer() → decodeAudioData()
     │   ├─ OfflineAudioContext(1, duration*16000, 16000)
     │   ├─ startRendering() → Float32Array
     │   └─ Float32 → Int16 PCM
     │
     ├─ arrayBufferToBase64(): Base64 编码
     │
     ├─ 请求 vop.baidu.com/server_api
     │   ├─ Method: POST
     │   ├─ Body: { format: 'pcm', rate: 16000, channel: 1, token, speech: base64, len: byteLength }
     │   ├─ 直接请求 (可能 CORS)
     │   └─ 降级: corsproxy.io 代理
     │
     └─ 解析响应 data.result[0] → 识别文字
```

### 5.2 音频格式

- 编码：PCM 16-bit
- 采样率：16000 Hz
- 声道：单声道（Mono）

### 5.3 CORS 处理

百度语音 API 不支持浏览器跨域请求，采用双重策略：
1. 先尝试直接 fetch
2. 失败则通过 `https://corsproxy.io/` 代理

---

## 6. 主题系统实现

### 6.1 CSS 变量架构

```css
/* 源码: src/index.css */

/* 层级 1: 根变量（默认暖琥珀） */
:root {
  --c-primary: #d97706;
  --c-primary-gradient: linear-gradient(135deg, #e6a817, #d97706, #b45309);
  --s-page: linear-gradient(160deg, #fefcf8 0%, #fef7ed 30%, #fef9f0 100%);
  --s-card: rgba(255,255,255,0.5);
  --s-card-accent: rgba(217,119,6,0.06);
  /* ... 全部 CSS 变量 ... */
}

/* 层级 2: 6 个固定主题类 */
.theme-warm-amber { --c-primary: #d97706; /* ... */ }
.theme-forest-green { --c-primary: #059669; /* ... */ }
.theme-ocean-blue { --c-primary: #2563eb; /* ... */ }
.theme-rose-pink { --c-primary: #e11d48; /* ... */ }
.theme-lavender { --c-primary: #7c3aed; /* ... */ }
.theme-sunset-orange { --c-primary: #ea580c; /* ... */ }

/* 层级 3: 8 个动态心情主题类 */
.theme-dynamic-happy { --c-primary: #f59e0b; /* ... */ }
.theme-dynamic-calm { --c-primary: #14b8a6; /* ... */ }
/* ... */
.theme-dynamic-tired { --c-primary: #a8a29e; /* ... */ }

/* 层级 4: 暗色模式覆盖 (.dark) */
.dark { --t-heading: #fafaf9; --s-page: linear-gradient(...); /* ... */ }
```

### 6.2 React 集成

在 `AppLayout.tsx` 中动态切换主题类：

```typescript
useEffect(() => {
  const root = document.documentElement

  // 1. 清除所有主题类
  FIXED_THEMES.forEach(t => root.classList.remove(`theme-${t}`))
  DYNAMIC_MOODS.forEach(m => root.classList.remove(`theme-dynamic-${m}`))

  // 2. 根据设置添加对应类
  if (settings?.themeMode === 'fixed' && settings?.fixedTheme) {
    root.classList.add(`theme-${settings.fixedTheme}`)
  } else {
    // 动态模式：计算 moodKey → 添加 theme-dynamic-{moodKey}
    root.classList.add(`theme-dynamic-${moodKey}`)
  }
}, [settings?.themeMode, settings?.fixedTheme, moodKey])
```

**moodKey 计算（3 种策略）：**
```typescript
const moodKey = useMemo(() => {
  if (scheme === 'latest') return 最后一条有 mood 的支出的心情
  if (scheme === 'adaptive') return 今天最后一条有 mood 的支出的心情
  return 当月出现次数最多的心情 // most-frequent
}, [transactions, settings?.colorScheme])
```

### 6.3 暗色模式

```typescript
// Zustand store: stores/uiStore.ts
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement
  if (theme === 'dark' || (theme === 'system' && matchMedia('prefers-color-scheme: dark').matches)) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}
```

---

## 7. 状态管理（Zustand）

唯一的 Zustand Store：`src/stores/uiStore.ts`

```typescript
interface UIState {
  sidebarOpen: boolean       // 移动端侧边栏开/关
  theme: 'light'|'dark'|'system'  // 明暗模式（持久化到 localStorage）
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme) => void  // 切换时更新 localStorage + DOM class
}
```

**为什么只用 Zustand 管理 UI 状态？**
- 业务数据全部在 IndexedDB 中，通过 Dexie 的 `useLiveQuery` 实现响应式更新
- 不需要全局业务状态管理——数据库就是 single source of truth
- UI 状态（侧栏、主题）是真正需要跨组件共享的

---

## 8. 数据流

```
IndexedDB (Dexie.js)
     │
     ├─ useLiveQuery (dexie-react-hooks)
     │   │
     │   ├─ useTransactions(filter?) → transactions[]
     │   ├─ useCategories() → categories[] + CRUD
     │   ├─ useBudgets() → budgets[] + CRUD
     │   ├─ useSettings() → settings + update
     │   ├─ useChatMessages() → messages[] + CRUD
     │   ├─ useProjects() → projects[] + CRUD
     │   ├─ useJarGoals() → goals[] + CRUD
     │   ├─ useCoolDownEvents() → events[] + CRUD
     │   └─ useDeficits() → deficits[] + CRUD
     │
     ├─ 统计层 (lib/stats.ts)
     │   ├─ getMonthlyStats() → { totalExpense, totalIncome, balance, count }
     │   ├─ getCategoryBreakdown() → CategoryBreakdown[]
     │   ├─ getDailyTrend() → DailyTrend[]
     │   └─ getPreviousMonthComparison() → { expenseChange, incomeChange }
     │
     ├─ AI 服务层 (services/llm.ts)
     │   ├─ parseTransaction() → ParsedTransaction
     │   ├─ generateReport() → Markdown string
     │   ├─ chatQuery() → string
     │   └─ analyzeCalmEvent() → CoolDownAIAnalysis
     │
     ├─ 语音服务层 (services/speech.ts)
     │   └─ startRecognition() → 识别文字
     │
     ├─ 导出服务层 (services/export.ts)
     │   └─ exportAllData() / importAllData() / exportCSV()
     │
     ├─ React 组件 (pages/ + components/)
     │   ├─ useMemo: 从原始数据派生图表数据
     │   └─ useState: 组件内 UI 状态（模态框、筛选等）
     │
     └─ Zustand (stores/uiStore.ts)
         └─ 跨组件共享的 UI 状态
```

---

## 9. 构建配置

### 9.1 Vite (vite.config.ts)

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/Auto-Money/',                          // GitHub Pages 部署路径
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),     // import '@/...' 路径别名
    },
  },
})
```

### 9.2 TypeScript

**tsconfig.json：** 项目引用模式，分为 app 和 node 两个配置：
- `tsconfig.app.json`：target ES2020, jsx react-jsx, strict, skipLibCheck
- `tsconfig.node.json`：target ES2022, 仅用于 Vite 配置文件

**路径别名：** `@/*` → `./src/*`（需同时在 tsconfig.app.json 和 vite.config.ts 中配置）

### 9.3 Tailwind CSS (tailwind.config.js)

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',  // 手动切换暗色模式（非跟随系统）
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        muted: { /* ... */ },
      },
      borderRadius: { lg: 'var(--radius)', md: '...', sm: '...' },
    },
  },
  plugins: [],
}
```

### 9.4 构建脚本

```json
{
  "scripts": {
    "dev": "vite",                      // 开发服务器（HMR）
    "build": "tsc -b && vite build",    // 类型检查 + 生产构建
    "preview": "vite preview"           // 预览构建产物
  }
}
```

---

## 10. 部署流程

### 10.1 GitHub Pages Actions

`.github/workflows/deploy.yml`：

```yaml
on:
  push:
    branches: [master]
  workflow_dispatch:  # 支持手动触发

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - Checkout (actions/checkout@v4)
      - Setup Node 20 (actions/setup-node@v4)
      - npm ci
      - npm run build (tsc -b && vite build)
      - Upload artifact → ./dist (actions/upload-pages-artifact@v3)
      - Deploy → GitHub Pages (actions/deploy-pages@v4)
```

### 10.2 部署地址

`https://TRY-0508.github.io/Auto-Money/`

### 10.3 HashRouter 必要性

使用 HashRouter（而非 BrowserRouter）因为 GitHub Pages 不支持 SPA 的 `history.pushState` 回退——所有非根路径的请求都会返回 404。HashRouter 将路由信息放在 URL hash 中（`/#/ai`），不需要服务端配置。

---

## 11. 性能优化

### 11.1 代码分割

当前未实现显式的 `React.lazy` 代码分割——4 个页面组件直接 import。对于当前规模的应用（4 个页面），Bundle 体积尚可接受。

### 11.2 Canvas 动画优化

**ParticleNetwork：**
- 固定 80 个粒子（不做屏幕尺寸自适应数量）
- `requestAnimationFrame` 循环渲染
- 每个粒子有独立的相位偏移（sin 波动画）代替每帧随机计算
- 线条连接距离限制 120px，O(n²) 但粒子数固定

**SplashScreen 物理引擎：**
- 移动端 12 个图标、桌面端 24 个（响应式调整）
- `requestAnimationFrame` 循环：
  - 位置更新（带边缘反弹）
  - O(n²) 碰撞检测和排斥力
  - 速度上限 clamp(-1.5, 1.5)

**ParticleEffect（点击粒子）：**
- 每次点击创建 8 个粒子
- CSS transition 驱动动画（硬件加速）
- 650ms 后自动清理 DOM 元素

### 11.3 Recharts 图表

- 图表数据通过 `useMemo` 缓存，避免不必要的重计算
- 图表仅在有数据时渲染，避免空数据时的 DOM 开销
- `ResponsiveContainer` 确保图表响应父容器尺寸

### 11.4 Dexie IndexedDB

- 索引仅在频繁查询的字段上建立（date, type, categoryId, mood, status 等）
- `useLiveQuery` 仅在依赖变化时重新查询
- 大事务查询在 `useMemo` 外层过滤，减少 IndexedDB 查询次数

---

## 12. 安全考虑

### 12.1 API Key 安全

- **存储：** AES-GCM 256 位加密存储于 IndexedDB；加密密钥存储于 localStorage
- **传输：** 通过 HTTPS 传输到 DeepSeek API
- **风险：** 浏览器端加密意味着恶意浏览器扩展/脚本可能窃取解密后的 Key；纯静态站点无法做服务端代理
- **缓解：** 使用 `dangerouslyAllowBrowser: true` 标注了风险，用户自行选择是否使用

### 12.2 XSS 防护

- 用户输入的交易描述使用 React 默认的文本插入（非 dangerouslySetInnerHTML），自动转义
- AI 生成的报告使用 `dangerouslySetInnerHTML`，但 AI 输出为 Markdown 转换后的 HTML——存在理论上的 prompt injection 风险
- 建议：未来版本对 AI 输出的 HTML 做 sanitization（如 DOMPurify）

### 12.3 数据隐私

- 所有数据存储在浏览器本地（IndexedDB），不经过任何第三方服务器
- 用户可随时导出 JSON/CSV 备份
- 用户可随时清除所有数据（清除 IndexedDB 的所有表）

### 12.4 依赖安全

- Vite 6 已修复已知漏洞
- 仅使用知名 npm 包（React, Dexie, Recharts, lucide-react 等）
- `openai` SDK v4.73.0 为较新版本

---

## 13. 已知限制

1. **API Key 浏览器端暴露：** 纯静态站点无后端代理，API Key 虽加密存储但仍可在客户端解密
2. **DeepSeek API 调用频率：** 免费版有调用限制，高频率使用可能触发限流
3. **语音识别 CORS：** 依赖第三方 corsproxy.io 代理，该服务可能不稳定或下线
4. **IndexedDB 容量：** 浏览器限制通常为几百 MB，对记账应用已足够但超大量数据可能受限
5. **无 PWA 离线支持：** 尚未配置 Service Worker，断网时无法使用
6. **暗色模式未完全适配：** 部分 Tailwind 类使用硬编码颜色（如 `bg-gray-50`），切换暗色模式后可能视觉效果不佳
7. **AI 报告 HTML 渲染：** 使用简单的字符串替换转 Markdown，对复杂 Markdown（嵌套列表、表格、代码块）支持有限
8. **移动端手势：** 月历左右滑动的触摸事件处理较简单，可能不够流畅
9. **多标签同步：** 如果多个标签页同时打开并操作同一数据库，Dexie 无内置的跨标签同步机制
10. **无测试覆盖：** 项目目前没有任何单元测试或端到端测试
