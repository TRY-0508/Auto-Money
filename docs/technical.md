# 心情收支簿 — 技术实现

> 面向开发者的技术细节：技术栈、项目结构、数据库、API、构建部署。

## 1. 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 + CSS 自定义属性 |
| 状态 | Zustand |
| 数据 | Dexie.js (IndexedDB) |
| 路由 | react-router-dom v6 (HashRouter) |
| 图表 | Recharts |
| AI | OpenAI SDK → DeepSeek API |
| 语音 | 百度 REST API + MediaRecorder |
| 加密 | Web Crypto API (AES-GCM) |
| 图标 | Lucide React |

## 2. 项目结构

```
src/
├── main.tsx / App.tsx          # 入口 + 路由 + 封面
├── index.css                   # 设计系统 + 主题 CSS 变量
├── types/index.ts              # TypeScript 接口
├── lib/
│   ├── constants.ts            # 常量(心情/颜色/默认设置/分类描述)
│   ├── utils.ts                # ID生成/金额格式化/日期
│   ├── icons.tsx               # Lucide 图标映射
│   ├── crypto.ts               # AES-GCM 加解密
│   └── stats.ts                # 月统计/分类分解/趋势
├── db/
│   ├── index.ts                # Dexie Schema v8 + 升级迁移
│   ├── hooks.ts                # 9个数据表的 React hooks
│   └── seed.ts                 # 种子数据(5+5分类)
├── stores/uiStore.ts           # Zustand(侧栏开关/主题切换)
├── services/
│   ├── llm.ts                  # OpenAI客户端(解析/报告/聊天/分析)
│   ├── speech.ts               # 百度语音识别
│   └── export.ts               # JSON/CSV 导入导出
├── components/
│   ├── layout/                 # AppLayout/Header/Sidebar/BottomNav
│   ├── AddModal.tsx            # 记账弹窗(文字AI/语音/手动)
│   ├── CategoryIcon.tsx        # 分类图标
│   ├── EmptyState.tsx          # 空状态通用组件
│   ├── ParticleNetwork.tsx     # Canvas 粒子网络
│   ├── Popup.tsx               # 弹窗
│   ├── ProjectSwitcher.tsx     # 分账单切换
│   ├── SplashScreen.tsx        # 封面动画
│   └── StarJar.tsx             # 心愿星光可视化
└── pages/
    ├── Dashboard.tsx           # 首页
    ├── AIAssistant.tsx         # AI助手
    ├── JarPage.tsx             # 心愿
    └── Settings.tsx            # 设置
```

## 3. 数据库 (IndexedDB v8)

| 表 | 索引 | 说明 |
|----|------|------|
| `transactions` | date, type, categoryId, projectId, mood | 交易记录 |
| `categories` | type | 收支分类 |
| `budgets` | categoryId, yearMonth | 月度预算 |
| `settings` | id | 应用设置（含 totalStars） |
| `chatMessages` | timestamp | AI 对话 |
| `projects` | id | 分账单 |
| `jarGoals` | id | 心愿目标 |
| `coolDownEvents` | goalId, status, cooldownEndsAt, createdAt | 冷却事件 |
| `deficits` | yearMonth, status | 预算亏空 |

升级迁移：v5 清理旧支出 → v6 清理旧收入 → v7 强制清理 → v8 清理心理学收入

## 4. AI 集成

```
Base URL: https://api.deepseek.com/v1 (可配置)
Model: deepseek-chat (可配置)
```

| 函数 | 用途 |
|------|------|
| `parseTransaction()` | 自然语言→结构化记账（五型+心情） |
| `generateReport()` | 月度财务报告（Markdown） |
| `chatQuery()` | 带数据上下文的对话 |
| `analyzeCalmEvent()` | 冲动消费心理分析 |

## 5. 主题系统

CSS 变量架构：`:root` → `.theme-*` (6种固定) → `.theme-dynamic-*` (8种动态) → `.dark`

每个主题定义：`--c-primary*` / `--s-page` / `--s-card*` / `--aurora-*` / `--t-*`

React 集成类：`.bg-primary-gradient` / `.bg-primary` / `.text-accent` / `.btn-primary`

## 6. 构建与部署

```bash
npm run dev      # Vite 开发
npm run build    # tsc -b && vite build → dist/
```

GitHub Pages：push `master` → Actions 自动构建部署
Base path: `/Auto-Money/` · HashRouter 兼容
