# Auto Money — 系统设计

## 1. 技术选型

| 层面 | 选择 | 理由 |
|---|---|---|
| 框架 | React 18 + TypeScript | 组件化开发，类型安全，生态成熟 |
| 构建工具 | Vite | 快速 HMR，配置简洁，GitHub Pages 部署友好 |
| UI 组件库 | Tailwind CSS + shadcn/ui | 原子化样式 + 高质量无头组件，适合个人项目快速出 UI |
| 路由 | React Router v6 | SPA 页面路由 |
| 状态管理 | Zustand | 轻量，TS 友好，比 Redux 简洁 |
| 本地存储 | Dexie.js (IndexedDB) | IndexedDB 封装库，支持复杂查询，容量远大于 localStorage |
| 图表 | Recharts | React 原生图表库，声明式 API |
| 语音输入 | Web Speech API (SpeechRecognition) | 浏览器原生能力，无需额外依赖 |
| LLM 集成 | OpenAI SDK (兼容协议) | 默认使用 DeepSeek API，兼容所有 OpenAI 格式接口 |
| 国际化 | i18next + react-i18next | 支持中英文切换 |
| 日期处理 | dayjs | 轻量替代 moment.js |
| 测试 | Vitest + @testing-library/react | Vite 生态，与构建工具一致 |

## 2. 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    浏览器 (SPA)                       │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  UI 层   │  │ 路由层   │  │  状态管理层       │   │
│  │ (React   │  │ (React   │  │  (Zustand        │   │
│  │ 组件)    │  │  Router) │  │   stores)        │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │             │                  │              │
│  ┌────┴─────────────┴──────────────────┴──────────┐  │
│  │                  服务层                          │  │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────┐  │  │
│  │  │ LLM       │  │ 语音      │  │ 报告生成    │  │  │
│  │  │ Service   │  │ Service   │  │ Service     │  │  │
│  │  └───────────┘  └───────────┘  └────────────┘  │  │
│  └────┬────────────────────────────────────────────┘  │
│       │                                                │
│  ┌────┴────────────────────────────────────────────┐  │
│  │                  数据层                           │  │
│  │         Dexie.js (IndexedDB)                     │  │
│  │  transactions │ categories │ budgets │ settings │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │                  外部 API                         │  │
│  │     DeepSeek / OpenAI 兼容 LLM 服务               │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 3. 路由设计

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | Dashboard | 月度统计 + 图表 + 交易列表（筛选/搜索/编辑删除）+ FAB 快捷记账 |
| `/ai` | AI 助手 | 两个 Tab：智能报告 + 对话查询 |
| `/settings` | 设置 | API Key、自定义分类管理、月度预算、数据导入导出 |

记账通过全局 Modal 弹窗触发（桌面端 Header 按钮 + 移动端底部中间 FAB），无需独立路由。

## 4. 数据模型

### Transaction（交易记录）

```typescript
interface Transaction {
  id: string;           // UUID
  type: 'income' | 'expense';
  amount: number;       // 金额，单位元
  categoryId: string;   // 关联分类
  description: string;  // 描述（用户原始输入）
  date: string;         // 交易日期 YYYY-MM-DD
  createdAt: number;    // 创建时间戳
  updatedAt: number;    // 更新时间戳
  aiParsed: boolean;    // 是否经过 AI 解析
}
```

### Category（分类）

```typescript
interface Category {
  id: string;
  name: string;         // 如"餐饮""交通""工资"
  type: 'income' | 'expense';
  icon: string;         // emoji 或图标标识
  color: string;        // 展示颜色
  isSystem: boolean;    // 是否为系统预设
}
```

**预设分类**：
- 支出：餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、日用、其他
- 收入：工资、兼职、理财、红包、报销、其他

### Budget（预算）

```typescript
interface Budget {
  id: string;
  categoryId: string;   // 可为 null，表示总预算
  amount: number;
  period: 'monthly' | 'yearly';
  yearMonth: string;    // 适用月份 YYYY-MM
}
```

### Settings（设置）

```typescript
interface Settings {
  apiKey: string;
  apiBaseUrl: string;       // 默认 https://api.deepseek.com/v1
  model: string;            // 默认 deepseek-chat
  language: 'zh' | 'en';
  currency: string;         // 默认 CNY
  theme: 'light' | 'dark' | 'system';
}
```

## 5. AI 服务设计

### 5.0 提示词模板

项目包含三套提示词模板，按场景使用：

**记账解析提示词**（`prompts/parse-transaction.md`）：

```
你是记账助手。从用户输入中提取以下字段，以 JSON 格式返回：

- type: "expense" 或 "income"
- amount: 数字金额（单位：元）
- category: 分类名称，从以下列表匹配最合适的：
  支出：餐饮、交通、购物、娱乐、住房、医疗、教育、通讯、日用、其他
  收入：工资、兼职、理财、红包、报销、其他
- date: 日期，格式 YYYY-MM-DD，未提及时默认为今天
- description: 简短描述（5-15字概括）

判断规则：
- "花了""买了""支付""消费"→ expense
- "收到""赚了""工资""入账"→ income
- 金额出现多个时，取总和
- 对模糊分类选择置信度最高的

用户输入：{user_input}

只返回 JSON，不要其他内容。
```

**报告生成提示词**（`prompts/generate-report.md`）：

```
你是温暖的记账小助手，帮用户分析 {period_type} 的收支情况。

以下是 {period_label} 的交易数据和预算情况：
{transaction_summary}
{budget_summary}

请生成一份有人情味的财务报告，用 Markdown 格式，包含：
1. 一个亲切的总体评价（像朋友聊天）
2. 收支概览（总数+环比）
3. 支出排行 Top 3
4. 预算执行情况
5. 1-2 条实用小建议

语气温暖、鼓励，不要冷冰冰的数字罗列。
```

**对话助手提示词**（`prompts/chat-assistant.md`）：

```
你是 Auto Money 的智能记账助手，帮助用户查询和分析个人财务。

当前用户数据概览：
{data_context}

规则：
- 只基于提供的数据回答，不编造
- 回答简洁，2-5 句
- 用温和友好的语气
- 涉及金额时精确到元

用户问题：{user_question}
```

### 5.1 智能记账解析

**输入**：用户自然语言文本
**输出**：结构化交易信息

LLM 提示词核心逻辑：
```
你是记账助手。从用户输入中提取：类型(收入/支出)、金额、分类、日期、描述。
- 如果没提到日期，默认今天
- 如果没明确收支类型，"花了""买了""支付"→支出，"收到""赚了""工资"→收入
- 分类从预设列表中匹配最合适的

用户输入：{user_input}

返回JSON格式：{ type, amount, category, date, description, confidence }
```

**调用时机**：用户在 `/add` 页面提交文字或语音转文字后

### 5.2 AI 周期报告

**输入**：一段时间内的交易列表 + 预算数据
**输出**：结构化的报告内容

报告包含：
- 总收支概览（对比上期）
- 分类排行与占比
- 异常支出提醒
- 预算执行情况
- AI 给出的个性化建议（语气温暖，像朋友聊天）

**调用时机**：用户进入 `/reports` 页面时手动触发，也可设置每周自动提醒生成

### 5.3 AI 对话查询

**输入**：用户自然语言问题 + 当前交易数据（作为上下文）
**输出**：自然语言回答

示例问答：
- "这个月吃饭花了多少？" → "这个月餐饮一共 2,340 元，比上个月多了 15%，日均 78 元。"
- "我最近是不是花太多了？" → AI 分析趋势并给出建议
- "帮我对比一下这个月和上个月的支出" → 对比分析

### 5.4 LLM 调用策略

- 默认使用 DeepSeek API（`https://api.deepseek.com/v1`，模型 `deepseek-chat`）
- 用户可在设置中切换为其他兼容 OpenAI 协议的 API（如 OpenAI、Groq 等）
- 所有 LLM 调用带上交易数据上下文（最近 3 个月的交易摘要）
- 调用前检查 API Key 是否配置，未配置则引导用户去设置页
- 每次调用独立，不维护服务端会话
- 不做流式（`stream: false`），简化处理逻辑，等待完整响应再渲染

### 5.5 API 错误处理

| 错误类型 | 处理方式 |
|---|---|
| 401/403 认证失败 | 提示用户检查 API Key，跳转设置页 |
| 429 频率限制 | 显示"请求太频繁，请稍后再试"，3 秒后允许重试 |
| 网络超时（>15s） | 显示"网络超时"，提供重试按钮 |
| JSON 解析失败 | 显示原始 AI 输出，让用户手动填写 |
| 浏览器不支持语音 | 隐藏语音按钮，仅显示文字输入 |

## 6. 组件树

```
App
├── Layout
│   ├── Sidebar (桌面端3项)
│   ├── BottomNav (移动端3项 + 居中FAB)
│   └── Header (面包屑 + 记账按钮)
├── Pages (3 routes)
│   ├── Dashboard
│   │   ├── MonthSelector + 图表折叠
│   │   ├── StatsCards (收入/支出/结余)
│   │   ├── PieChart + TrendChart
│   │   ├── FilterBar (类型/分类/搜索)
│   │   ├── TransactionList (按日分组)
│   │   ├── EditModal + DeleteConfirm
│   │   └── FAB (quick add)
│   ├── AIAssistant
│   │   ├── TabBar (智能报告 / 对话助手)
│   │   ├── ReportTab
│   │   └── ChatTab
│   └── Settings
│       ├── ApiKeyConfig
│       ├── CategoryManager (新建/编辑/删除分类)
│       ├── BudgetManager (总预算 + 分类预算进度)
│       └── DataExportImport
├── Modals (global)
│   └── AddModal (3-step: input→parsed→manual, text/voice)
└── Shared Components
    ├── CategoryIcon
    └── EmptyState
```

## 7. 源码目录结构

```
src/
├── main.tsx                    # 入口文件
├── App.tsx                     # 根组件，路由配置
├── index.css                   # Tailwind 全局样式
├── db/                         # 数据层
│   ├── index.ts                # Dexie 实例与表定义
│   ├── seed.ts                 # 预设分类种子数据
│   └── hooks.ts                # useTransactions 等数据 Hook
├── stores/                     # Zustand 状态
│   ├── uiStore.ts              # 侧边栏、主题等 UI 状态
│   └── appStore.ts             # 应用级状态（初始化标记等）
├── services/                   # 服务层
│   ├── llm.ts                  # OpenAI SDK 封装、API 调用
│   ├── speech.ts               # Web Speech API 封装
│   └── export.ts               # 数据导出工具
├── prompts/                    # LLM 提示词模板
│   ├── parse-transaction.ts    # 记账解析
│   ├── generate-report.ts      # 报告生成
│   └── chat-assistant.ts       # 对话助手
├── components/                 # 共享组件
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── Header.tsx
│   ├── ui/                     # shadcn/ui 组件
│   ├── CategoryIcon.tsx
│   ├── AmountDisplay.tsx
│   ├── TransactionItem.tsx
│   ├── EmptyState.tsx
│   └── LoadingSkeleton.tsx
├── pages/                      # 页面组件
│   ├── Dashboard.tsx
│   ├── TransactionList.tsx
│   ├── AddTransaction.tsx
│   ├── Reports.tsx
│   ├── Chat.tsx
│   ├── Budget.tsx
│   └── Settings.tsx
├── lib/                        # 工具函数
│   ├── utils.ts                # 通用工具（日期、金额格式化等）
│   ├── crypto.ts               # Web Crypto API 加解密
│   └── constants.ts            # 常量定义
└── types/                      # TypeScript 类型
    └── index.ts                # 所有 interface 定义
```

## 8. 响应式设计策略

- **移动端优先**：以手机屏幕（375px）为基准设计，逐步增强到桌面端
- **导航**：移动端底部 Tab Bar，桌面端侧边栏
- **断点**：sm(640px) / md(768px) / lg(1024px)
- **记账入口**：移动端使用 FAB（悬浮按钮），桌面端使用顶部快速输入框

## 9. 数据安全

- API Key 使用 Web Crypto API 加密存储在 IndexedDB
- 交易数据明文存储（纯本地，无需加密）
- 导出的 JSON/CSV 文件提示用户妥善保管
- 所有 LLM API 请求直接从前端发出，不经过任何中间服务器

## 10. 部署方案

- 构建命令：`npm run build`
- 输出目录：`dist/`
- 部署到 GitHub Pages：使用 `gh-pages` 包或 GitHub Actions
- 访问地址：`https://<username>.github.io/auto-money`
- 配置 SPA fallback：404.html 重定向方案支持前端路由
