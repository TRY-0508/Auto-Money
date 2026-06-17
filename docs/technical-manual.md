# 心情收支簿 — 技术实现手册

## 1. 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 框架 | React 18 + TypeScript | UI 构建 |
| 构建 | Vite 6 | 开发/生产构建 |
| 样式 | Tailwind CSS 3 + 自定义 CSS 变量 | 主题系统 |
| 状态 | Zustand | UI 状态（侧栏/主题） |
| 数据 | Dexie.js (IndexedDB) | 本地持久化 |
| 路由 | react-router-dom v6 (HashRouter) | GitHub Pages 兼容 |
| 图表 | Recharts | 饼图/柱状图/面积图 |
| AI | OpenAI SDK (DeepSeek API) | 记账解析/报告/分析 |
| 语音 | 百度 REST API + MediaRecorder | 语音记账 |
| 加密 | Web Crypto API (AES-GCM) | API Key 加密存储 |
| 图标 | Lucide React | 全界面图标 |

## 2. 项目结构

```
src/
├── main.tsx                      # 入口
├── App.tsx                       # 路由 + 封面 + 快捷键
├── index.css                     # 全局样式 + 设计系统 + 主题
├── types/
│   └── index.ts                  # 所有 TypeScript 接口
├── lib/
│   ├── constants.ts              # 常量(心情/颜色/默认设置/分类描述)
│   ├── utils.ts                  # 工具函数(ID/金额/日期)
│   ├── icons.tsx                 # Lucide 图标映射
│   ├── crypto.ts                 # AES-GCM 加解密
│   └── stats.ts                  # 统计计算(月度/分类/趋势)
├── db/
│   ├── index.ts                  # Dexie 数据库定义(Schema v7)
│   ├── hooks.ts                  # React hooks(8个数据表)
│   └── seed.ts                   # 种子数据(5+5心理学分类)
├── stores/
│   └── uiStore.ts                # Zustand(侧栏/主题切换)
├── services/
│   ├── llm.ts                    # OpenAI 客户端(解析/报告/聊天/分析)
│   ├── speech.ts                 # 百度语音识别
│   └── export.ts                 # JSON/CSV 导入导出
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx         # 全局布局(主题管控)
│   │   ├── Header.tsx            # 顶栏 + FAB
│   │   ├── Sidebar.tsx           # 桌面侧栏导航
│   │   └── BottomNav.tsx         # 移动底部导航
│   ├── AddModal.tsx              # 记账弹窗(文字AI/语音/手动)
│   ├── CategoryIcon.tsx          # 分类图标组件
│   ├── EmptyState.tsx            # 空状态通用组件
│   ├── ParticleNetwork.tsx       # Canvas 粒子网络背景
│   ├── ParticleEffect.tsx        # 点击粒子爆炸
│   ├── Popup.tsx                 # 弹窗通用组件
│   ├── ProjectSwitcher.tsx       # 分账单选项卡
│   ├── SplashScreen.tsx          # 封面动画
│   └── StarJar.tsx               # 心愿星光可视化
└── pages/
    ├── Dashboard.tsx             # 首页(Banner+统计+图表+列表)
    ├── AIAssistant.tsx           # AI助手(报告/分析/对话)
    ├── JarPage.tsx               # 心愿(目标/冷却/轨迹)
    └── Settings.tsx              # 设置(API/主题/分类/预算/数据)
```

## 3. 数据库 Schema (IndexedDB v7)

| 表名 | 主键 | 索引 | 用途 |
|------|------|------|------|
| `transactions` | id | date, type, categoryId, projectId, mood | 交易记录 |
| `categories` | id | type | 收支分类 |
| `budgets` | id | categoryId, yearMonth | 月度预算 |
| `settings` | id | — | 应用设置 |
| `chatMessages` | id | timestamp | AI 对话历史 |
| `projects` | id | — | 分账单 |
| `jarGoals` | id | — | 心愿目标 |
| `coolDownEvents` | id | goalId, status, cooldownEndsAt, createdAt | 冲动冷却事件 |
| `deficits` | id | yearMonth, status | 预算亏空 |

## 4. 路由与页面

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | Dashboard | 首页：心情Banner + 统计卡 + 扇形图/柱状图/面积图 + 时间线 + 月历 + 交易列表 |
| `/ai` | AIAssistant | AI助手：3 Tab(财务报告/心理分析/对话) |
| `/jar` | JarPage | 心愿：3 Tab(心愿/冷却/轨迹) |
| `/settings` | Settings | 设置：API · 语音 · 主题 · 分类 · 预算 · 分账单 · 数据 |

封面 SplashScreen 在首次访问时展示（sessionStorage 标记），进入后由 `AppLayout` 包裹所有页面。

## 5. 主题系统

### 5.1 CSS 变量架构

主题系统基于 CSS 自定义属性，所有颜色通过变量引用：

```
:root            → 默认值(暖琥珀)
.theme-*         → 固定主题覆盖(6种)
.theme-dynamic-* → 动态心情覆盖(8种)
.dark            → 暗色模式覆盖
```

### 5.2 变量分类

| 变量组 | 前缀 | 用途 |
|--------|------|------|
| Brand | `--c-primary*` | 品牌主色/渐变/悬浮态 |
| Data | `--c-income/expense/balance` | 收入/支出/结余语义色 |
| Text | `--t-heading/body/secondary/muted` | 文字层级 |
| Surface | `--s-page/card/input` | 页面/卡片/输入框背景 |
| Card Tiers | `--s-card-accent/stat/chart/list/soft` | 卡片色阶 |
| Aurora | `--aurora-1/2/3` | 背景极光 |

### 5.3 主题切换流程

```
Settings → updateSettings() → IndexedDB
  → AppLayout useEffect → html.classList.add('theme-xxx')
  → CSS 变量覆盖所有颜色引用
```

## 6. AI 集成

### 6.1 服务端点

使用 OpenAI 兼容 SDK，默认指向 DeepSeek API：
- Base URL: `https://api.deepseek.com/v1`
- Model: `deepseek-chat`
- 可在设置中自定义

### 6.2 四个 AI 函数

| 函数 | 用途 | System Prompt |
|------|------|--------------|
| `parseTransaction()` | 自然语言→结构化记账 | 消费/收入心理学五型判断规则 |
| `generateReport()` | 月度/周度财务报告 | 温暖鼓励语气 Markdown 输出 |
| `chatQuery()` | 对话式查询 | 带数据上下文的助手对话 |
| `analyzeCalmEvent()` | 冲动消费心理分析 | 风险因素+冷却建议+反思问题 |

### 6.3 API Key 安全

- 使用 Web Crypto API AES-GCM 加密
- 加密密钥存储在 localStorage
- 加密后的 API Key 存储在 IndexedDB
- 每次请求时动态解密

## 7. 构建与部署

### 7.1 构建命令

```bash
npm run build    # tsc -b && vite build
npm run dev      # 本地开发
```

### 7.2 GitHub Pages 部署

`.github/workflows/deploy.yml`:
- 触发：push 到 `master` 分支
- 步骤：Checkout → npm ci → npm run build → 上传 dist/ → 部署 Pages
- Base path: `/Auto-Money/`
- HashRouter 兼容 GitHub Pages

### 7.3 响应式

| 断点 | 布局 |
|------|------|
| < 640px | 2列 Bento，底部导航，侧栏隐藏 |
| ≥ 640px | 4列 Bento，侧栏常驻 |

## 8. 设计系统关键类

| 类名 | 用途 |
|------|------|
| `.card` | 基础毛玻璃卡片 |
| `.card-accent` | 品牌强调卡片 |
| `.card-stat` | 统计数据卡片 |
| `.card-chart` | 图表卡片 |
| `.card-list` | 列表/时间线卡片 |
| `.card-soft` | 柔和装饰卡片 |
| `.glow-card` | 设置页毛玻璃卡片 |
| `.btn-primary` | 主题渐变主按钮 |
| `.btn-secondary` | 次级按钮 |
| `.btn-danger` | 危险操作按钮 |
| `.bg-primary-gradient` | 纯主题渐变背景 |
| `.bg-primary` | 主题纯色背景 |
| `.text-accent` | 主题色文字 |
| `.bento` | 4列网格容器 |
| `.fab` | 浮动操作按钮 |
| `.aurora-bg` | 极光背景 |
