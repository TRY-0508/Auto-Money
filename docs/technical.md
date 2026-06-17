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
| AI | OpenAI SDK → DeepSeek API（可配置） |
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
│   ├── icons.tsx               # Lucide 图标映射(全项目共用)
│   ├── crypto.ts               # AES-GCM 加解密
│   └── stats.ts                # 月统计/分类分解/趋势/环比
├── db/
│   ├── index.ts                # Dexie Schema v7 + 升级迁移
│   ├── hooks.ts                # 9个数据表的 React hooks
│   └── seed.ts                 # 种子数据(5+5心理学分类)
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
│   ├── ParticleNetwork.tsx     # Canvas 粒子网络背景
│   ├── ParticleEffect.tsx      # 点击粒子爆炸
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

## 3. 数据库 (IndexedDB v7)

| 表 | 索引 | 说明 |
|----|------|------|
| `transactions` | date, type, categoryId, projectId, mood | 交易记录 |
| `categories` | type | 收支分类 |
| `budgets` | categoryId, yearMonth | 月度预算 |
| `settings` | id | 应用设置 |
| `chatMessages` | timestamp | AI 对话 |
| `projects` | id | 分账单 |
| `jarGoals` | id | 心愿目标 |
| `coolDownEvents` | goalId, status, cooldownEndsAt, createdAt | 冷却事件 |
| `deficits` | yearMonth, status | 预算亏空 |

升级迁移：v5 清理旧支出分类 → v6 清理旧收入分类 → v7 强制清理非心理学分类

## 4. AI 集成

### 端点

```
Base URL: https://api.deepseek.com/v1 (可配置)
Model: deepseek-chat (可配置)
SDK: OpenAI 兼容客户端
```

### 四个函数

| 函数 | 输入 | 输出 | 用途 |
|------|------|------|------|
| `parseTransaction()` | 自由文本 | ParsedTransaction JSON | 自然语言→结构化记账 |
| `generateReport()` | 月度数据 | Markdown 文本 | 财务报告 |
| `chatQuery()` | 用户消息 + 数据上下文 | 文本回复 | 对话助手 |
| `analyzeCalmEvent()` | 消费描述 + 金额 | CoolDownAIAnalysis JSON | 冲动心理分析 |

### API Key 安全

- 加密：AES-GCM (Web Crypto)
- 加密密钥存储在 localStorage
- 加密后的 API Key 存储在 IndexedDB
- 每次请求动态解密；密码框不显示明文

## 5. 主题系统实现

### 核心机制

```
Settings DB → AppLayout useEffect → html.className
  → .theme-* / .theme-dynamic-* → CSS 变量覆盖
```

### CSS 变量分类

| 前缀 | 用途 | 数量 |
|------|------|------|
| `--c-primary-*` | 品牌色/渐变/悬浮 | 5 |
| `--c-income/expense/balance` | 数据语义色 | 3 |
| `--t-*` | 文字层级 | 4 |
| `--s-page/card/input` | 表面背景 | 3 |
| `--s-card-accent/stat/chart/list/soft` | 卡片色阶 | 5 |
| `--aurora-*` | 极光背景 | 3 |

每个固定主题定义 light + dark 两套完整变量；动态主题覆盖 `--c-primary*` + `--s-page` + `--s-card-accent`。

### React 集成

- `.bg-primary-gradient` / `.bg-primary` — CSS 类（背景）
- `.text-accent` — CSS 类（文字）
- `.btn-primary` — CSS 类（按钮渐变）
- `style={{background:'var(--c-primary-gradient)'}}` — inline（极少数场景）

## 6. 构建与部署

### 命令

```bash
npm run dev      # Vite 开发服务器
npm run build    # tsc -b && vite build → dist/
```

### GitHub Pages

`.github/workflows/deploy.yml`：
- 触发：push `master`
- 步骤：Checkout → npm ci → npm run build → upload dist/ → deploy Pages
- Base path: `/Auto-Money/`（vite.config.ts 配置）
- HashRouter 兼容

### 响应式

| 断点 | 布局变化 |
|------|---------|
| < 640px | Bento 2列 / 底部导航显示 / 侧栏隐藏 |
| ≥ 640px | Bento 4列 / 侧栏常驻 |

## 7. 安全与性能

- 全静态前端，无服务端
- API Key AES-GCM 加密存储
- React.lazy 代码分割（4 路由独立 chunk）
- Canvas 粒子使用 requestAnimationFrame
- Ctrl+K 全局快捷记账
