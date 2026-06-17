# 心情收支簿 — 系统设计

> 面向开发者的完整设计文档：架构、数据模型、页面布局、组件层级、视觉规范。

---

## 1. 产品定位与设计原则

**产品定位：** AI 驱动的消费心理学工具。帮助用户看见消费心理模式、暂停冲动、清醒选择。

**设计原则：**

| 原则 | 说明 |
|------|------|
| **温暖非评判** | 消费没有"对错"，只有"觉察"。不惩罚消费，只记录和反思 |
| **数据自主** | 所有数据存储在浏览器 IndexedDB，无需注册，可随时导出/清除 |
| **渐进式复杂度** | 新手看首页就能记账，深度用户可探索欲望冷却和 AI 分析 |
| **主题情绪化** | 界面色彩随用户的心情变化，消费可视化本身也是情绪可视化 |
| **移动优先** | 以手机端为主要使用场景设计，桌面端作为增强布局 |

---

## 2. 完整系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                       │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React 18 SPA (HashRouter)                 │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │  │
│  │  │ Zustand  │  │ Recharts │  │ ParticleNetwork    │   │  │
│  │  │ UI State │  │  Charts  │  │ Canvas Animation   │   │  │
│  │  └──────────┘  └──────────┘  └───────────────────┘   │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐ │  │
│  │  │  Dexie.js (IndexedDB Wrapper) — 9 Tables        │ │  │
│  │  │  transactions / categories / budgets / settings  │ │  │
│  │  │  chatMessages / projects / jarGoals              │ │  │
│  │  │  coolDownEvents / deficits                       │ │  │
│  │  └──────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────────┐              │
│  │  OpenAI SDK     │  │  Web Crypto API      │              │
│  │  → DeepSeek API │  │  AES-GCM Encryption  │              │
│  └─────────────────┘  └──────────────────────┘              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  百度 REST API → 语音识别                            │    │
│  │  - OAuth 2.0 Token (含 localStorage 缓存)            │    │
│  │  - PCM 16kHz 单声道转换 via OfflineAudioContext     │    │
│  │  - 直接请求 + CORS Proxy 降级                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tailwind CSS 3 + CSS 自定义属性                      │    │
│  │  - 6 固定主题 + 8 动态心情主题                        │    │
│  │  - 暗色模式 (.dark class)                             │    │
│  │  - 响应式: sm: 640px / md: 768px                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Pages (Static Hosting)               │
│                   Base: /Auto-Money/                          │
│                   CI/CD: .github/workflows/deploy.yml         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 路由与页面架构

使用 `react-router-dom v6` 的 `HashRouter`（兼容 GitHub Pages 静态托管）：

| 路由 | 页面组件 | 功能描述 |
|------|---------|----------|
| `/` | `Dashboard` | 首页：心情 Banner + 统计卡 + 双 Donut + 14 日流 + 心情时间线 + 月历热力图 + 交易列表 + 筛选 + FAB |
| `/ai` | `AIAssistant` | AI 助手：3 个 Tab（财务报告 / 心理分析 / 对话助手） |
| `/jar` | `JarPage` | 心愿页：3 个 Tab（心愿 / 欲望冷却 / 成长轨迹） |
| `/settings` | `Settings` | 设置页：6 个 Section（API 配置 / 语音识别 / 主题配色 / 收支分类 / 分账单 / 数据管理） + 月度预算 |

**布局组件 `AppLayout`：**
- 左侧 `Sidebar`（桌面端固定、移动端抽屉）
- 顶部 `Header`（标题 + 记一笔按钮）
- 底部 `BottomNav`（移动端底部导航栏）
- 背景 `ParticleNetwork`（Canvas 粒子网络）
- Aurora 极光背景（CSS `::before` 伪元素）

**特殊路由（非 HashRouter 导航）：**
- `SplashScreen`（封面动画）：通过 `sessionStorage` 控制在每次会话首次展示
- `AddModal`：全屏模态弹窗，通过状态控制开关

---

## 4. 完整数据模型

### 4.1 Transaction（交易记录）

索引字段：`id, date, type, categoryId, projectId, mood`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键，crypto.randomUUID() 生成 |
| `type` | `'expense' \| 'income'` | 交易类型：支出或收入 |
| `amount` | number | 交易金额（元），正数 |
| `categoryId` | string | 外键 → categories.id |
| `description` | string | 交易描述，可选 |
| `date` | string | 日期，格式 YYYY-MM-DD |
| `createdAt` | number | 创建时间戳（毫秒） |
| `updatedAt` | number | 最后更新时间戳（毫秒） |
| `aiParsed?` | boolean | 是否由 AI 解析生成 |
| `projectId?` | string | 外键 → projects.id，可选归属分账单 |
| `mood?` | string | 心情 key：happy/calm/neutral/sad/anxious/angry/excited/tired |
| `moodNote?` | string | 心情备注，可选 |

### 4.2 Category（收支分类）

索引字段：`id, type`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `name` | string | 分类名称（如"必要消费""工资"） |
| `type` | `'expense' \| 'income'` | 支出或收入分类 |
| `icon` | string | Lucide 图标 key（如 'home', 'zap'） |
| `color` | string | 颜色 hex（如 '#3b82f6'） |
| `isSystem` | boolean | 是否为系统预设分类（系统分类提示不可删除） |

**系统预设分类（种子数据）：**

支出（5 个）：
| 名称 | 图标 | 颜色 |
|------|------|------|
| 必要消费 | home | #3b82f6 |
| 价值消费 | trending-up | #10b981 |
| 情绪消费 | heart | #f43f5e |
| 冲动消费 | zap | #f59e0b |
| 意外消费 | alert-triangle | #f97316 |

收入（5 个）：
| 名称 | 图标 | 颜色 |
|------|------|------|
| 工资 | banknote | #22c55e |
| 兼职 | briefcase | #14b8a6 |
| 理财 | trending-up | #3b82f6 |
| 红包 | gift | #ef4444 |
| 其他 | more-horizontal | #6b7280 |

### 4.3 Budget（预算）

索引字段：`id, categoryId, yearMonth`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `categoryId` | string \| null | 外键 → categories.id（当前版本固定为 null，表示全局预算） |
| `amount` | number | 预算金额（元） |
| `period` | `'monthly' \| 'yearly'` | 预算周期（当前仅使用 monthly） |
| `yearMonth` | string | 预算月份，格式 YYYY-MM（如 '2026-06'） |

### 4.4 Settings（应用设置）

索引字段：`id`

存储方式：单条记录，`id = 'default'`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id?` | string | `'default'` | 固定标识 |
| `apiKey` | string | `''` | DeepSeek API Key（AES-GCM 加密后存储） |
| `apiBaseUrl` | string | `'https://api.deepseek.com/v1'` | API 端点，兼容 OpenAI 格式 |
| `model` | string | `'deepseek-chat'` | 模型名称 |
| `language` | `'zh' \| 'en'` | `'zh'` | 界面语言 |
| `currency` | string | `'CNY'` | 货币符号 |
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | 明暗模式 |
| `speechApiKey` | string | `''` | 百度语音 API Key |
| `speechSecretKey` | string | `''` | 百度语音 Secret Key |
| `speechProvider` | `'baidu' \| 'none'` | `'none'` | 语音识别供应商 |
| `colorScheme` | `'most-frequent' \| 'latest' \| 'adaptive'` | `'most-frequent'` | 动态配色跟随策略 |
| `themeMode` | `'dynamic' \| 'fixed'` | `'dynamic'` | 配色模式 |
| `fixedTheme` | string | `'warm-amber'` | 固定配色方案名 |
| `totalStars` | number | `0` | 全局星光累计计数 |

### 4.5 ChatMessage（AI 对话记录）

索引字段：`id, timestamp`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `role` | `'user' \| 'assistant'` | 消息角色 |
| `content` | string | 消息内容（Markdown） |
| `timestamp` | number | 时间戳（毫秒） |

### 4.6 Project（分账单）

索引字段：`id`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `name` | string | 分账单名称（如"春节旅游""游戏开支"） |
| `icon` | string | Lucide 图标 key |
| `color` | string | 颜色 hex |
| `createdAt` | number | 创建时间戳 |

### 4.7 JarGoal（心愿目标）

索引字段：`id`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `name` | string | 心愿名称（如"北海道旅行"） |
| `targetAmount` | number | 目标金额（元） |
| `currentAmount` | number | 当前已积累金额（元） |
| `description` | string | 心愿描述（为什么想实现） |
| `color` | string | 标识颜色 hex |
| `createdAt` | number | 创建时间戳 |

### 4.8 CoolDownEvent（冷却事件）

索引字段：`id, goalId, status, cooldownEndsAt, createdAt`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `goalId?` | string | 外键 → jarGoals.id，可选关联心愿 |
| `description` | string | 消费冲动描述 |
| `amount` | number | 金额（元） |
| `desireLevel` | number | 渴望程度 1-5 |
| `necessityLevel` | number | 必要性 1-5 |
| `emotionalState` | string | 情绪状态 |
| `impulseType` | `'emotional' \| 'impulsive' \| 'uncertain'` | 冲动类型 |
| `reason` | string | 冲动原因 |
| `cooldownHours` | number | 冷却时长（小时） |
| `cooldownStartedAt` | number | 冷却开始时间戳 |
| `cooldownEndsAt` | number | 冷却结束时间戳 |
| `status` | 见状态流 | 当前状态 |
| `reEvaluationNote?` | string | 重评估笔记 |
| `reEvaluationDesire?` | number | 重评估时渴望程度 1-5 |
| `reEvaluationAt?` | number | 重评估时间戳 |
| `earnedStar?` | boolean | 是否获得星光 |
| `earnedAt?` | number | 获得星光时间戳 |
| `boughtAt?` | number | 购买时间戳 |
| `createdAt` | number | 创建时间戳 |
| `aiAnalysis?` | CoolDownAIAnalysis | AI 分析结果 |

### 4.9 Deficit（预算亏空）

索引字段：`id, yearMonth, status`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string (UUID) | 主键 |
| `amount` | number | 亏空金额（元） |
| `yearMonth` | string | 月份 YYYY-MM |
| `remainingAmount` | number | 剩余亏空金额 |
| `status` | `'active' \| 'filled'` | 亏空状态 |
| `createdAt` | number | 创建时间戳 |

### 4.10 辅助类型

**CoolDownAIAnalysis（AI 分析结果，嵌入 CoolDownEvent）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `impulseType` | `'emotional' \| 'impulsive' \| 'uncertain'` | AI 判断的冲动类型 |
| `confidence` | number | 置信度 0-1 |
| `suggestedDesire` | number | 建议渴望程度 1-5 |
| `suggestedNecessity` | number | 建议必要性 1-5 |
| `riskFactors` | string[] | 风险因素数组（最多 3 个） |
| `suggestedCooldown` | number | 建议冷却小时数（24/48/72/168） |
| `reflectionQuestions` | string[] | 反思引导问题（2-3 个） |
| `summary` | string | AI 分析摘要 |

**ParsedTransaction（AI 解析结果，非持久化）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `'expense' \| 'income'` | 交易类型 |
| `amount` | number | 金额 |
| `category` | string | 分类名称 |
| `date` | string | 日期 YYYY-MM-DD |
| `description` | string | 描述 |
| `confidence` | number | 置信度 0-1 |
| `mood?` | string \| null | 推断心情 |

---

## 5. 状态流转图

### 5.1 冷却事件状态流转

```
                    创建冷却事件
                         │
                         ▼
                    ┌─────────┐
              ┌────▶│ cooling │──── 提前守住 ──────────────┐
              │     └────┬────┘                             │
              │          │ 到达 cooldownEndsAt               │
              │          ▼                                   │
              │   ┌──────────────┐                          │
   再冷静一下  │◀──│ pending_review│                          │
              │   └──┬───┬───┬───┘                          │
              │      │   │   │                               │
              │      │   │   └── failed（释怀/放过了）       │
              │      │   │                                    │
              └──────┘   ├── resisted（守住 → 星光+1, 金额计入心愿）
                         │
                         └── purchased（已购买）
```

**状态说明：**

| 状态 | 含义 | 可操作 |
|------|------|--------|
| `cooling` | 冷却中 | 查看倒计时 / 提前守住 / 删除 |
| `pending_review` | 冷却期满，等待决定 | 守住 / 购买 / 再冷却 / 删除 |
| `resisted` | 已守住（终结态） | 仅查看（出现在成长轨迹） |
| `failed` | 释怀/放过了（终结态） | 仅查看（出现在成长轨迹） |
| `purchased` | 已购买（终结态） | 仅查看（出现在成长轨迹） |

**定时检测：** `JarPage` 使用 `setInterval(10000ms)` 每 10 秒检查一次冷却事件，自动将到期的 `cooling` 事件更新为 `pending_review`。

### 5.2 预算亏空状态

```
超支发生（当月支出 > 预算）
         │
         ▼
   ┌──────────┐
   │  active  │ ── 下月结余填平 ──▶ ┌──────────┐
   └──────────┘                    │  filled  │
   remainingAmount > 0              └──────────┘
```

### 5.3 记账流程状态

```
记账模态框 3 步流转：
  input ──▶ parsed ──▶ manual ──▶ 保存

input 页：
  - 文字模式: 输入文本 → AI 解析 → parsed
  - 语音模式: 录音 → 识别 → 填入文本 → AI 解析 → parsed
  - 可直接跳转: 手动填写 → manual

parsed 页:
  - 展示 AI 解析结果（类型/金额/分类/日期/描述/心情/置信度）
  - 确认 → manual（带预填数据）
  - 返回 → input

manual 页:
  - 选择类型（支出/收入）
  - 输入金额
  - 选择分类（5 列网格）
  - 可选心情
  - 可选分账单
  - 可选日期
  - 保存 → 写入 DB → 关闭
```

---

## 6. AI 辅助流程

### 6.1 记账流程

```
用户输入 "中午吃饭花了35块，心情还不错"
     │
     ▼
parseTransaction(text)
     │
     ├─ getClient(): 获取 API Key → 判断是否已配置
     ├─ 构建 System Prompt:
     │   - 消费五型分类规则（含判断关键词）
     │   - 收入五分类规则
     │   - 心情推断规则
     │   - 日期填充规则（默认今天）
     │   - 多金额求和规则
     ├─ 调用 DeepSeek API (temperature: 0.1)
     ├─ 解析 JSON 响应:
     │   {
     │     "type": "expense",
     │     "amount": 35,
     │     "category": "必要消费",
     │     "date": "2026-06-17",
     │     "description": "午餐",
     │     "mood": "calm",
     │     "confidence": 0.95
     │   }
     └─ 返回 ParsedTransaction
     │
     ▼
用户确认 → 检查分类是否存在:
  - 存在: 直接使用
  - 不存在: 自动创建新分类
     │
     ▼
写入 transactions 表
```

### 6.2 冷却流程

```
用户记录消费冲动 "深夜逛淘宝看到一双鞋，特别喜欢"
     │
     ▼
analyzeCalmEvent(description, amount)
     │
     ├─ System Prompt:
     │   - 冲动类型判断逻辑（关键词→分类）
     │   - 渴望程度 1-5 / 必要性 1-5
     │   - 风险因素选择（10 个维度）
     │   - 建议冷却时长（24/48/72/168 小时）
     │   - 反思问题生成
     │   - 分析摘要
     ├─ Temperature: 0.3
     │
     ▼
返回 CoolDownAIAnalysis → 展示给用户
     │
     ▼
用户手动设置冷却时长 → 创建 CoolDownEvent
     │
     ▼
冷却中...（每 10s 检查倒计时）
     │
     ▼
冷却期满 → pending_review → 用户决定
```

### 6.3 报告生成流程

```
用户在 AI 助手 Tab → 点击"生成财务报告"
     │
     ▼
构建上下文:
  - 交易统计（总数/收支/预算进度）
  - 支出分类排行
  - 预算信息
     │
     ▼
generateReport(transactionsSummary, budgetSummary, periodType, periodLabel)
     │
     ├─ System Prompt: 温暖记者人设，输出 Markdown
     │   - 总体评价（像朋友聊天）
     │   - 收支概览 + 环比
     │   - 支出排行 Top 3
     │   - 预算执行情况
     │   - 1-2 条实用建议
     ├─ Temperature: 0.7
     │
     ▼
返回 Markdown 字符串 → 渲染为 HTML → 展示
```

---

## 7. 主题系统架构

### 7.1 CSS 变量层级

采用 4 级级联覆盖架构：

```
:root (基础定义)
  │
  ├── .theme-warm-amber     (6 个固定主题类)
  ├── .theme-forest-green
  ├── .theme-ocean-blue
  ├── .theme-rose-pink
  ├── .theme-lavender
  ├── .theme-sunset-orange
  │
  ├── .theme-dynamic-happy    (8 个动态心情主题类)
  ├── .theme-dynamic-calm
  ├── .theme-dynamic-neutral
  ├── .theme-dynamic-sad
  ├── .theme-dynamic-anxious
  ├── .theme-dynamic-angry
  ├── .theme-dynamic-excited
  └── .theme-dynamic-tired
  │
  └── .dark (暗色模式覆盖)
```

### 7.2 配色 Token 类别

每个主题定义 4 类 CSS 变量：

| 类别 | 变量前缀 | 说明 |
|------|---------|------|
| **品牌色** | `--c-primary`, `--c-primary-hover`, `--c-primary-soft`, `--c-primary-gradient`, `--c-primary-border` | 主色调及其变体 |
| **表面色** | `--s-page`, `--s-card`, `--s-card-hover`, `--s-input` | 页面/卡片/输入框背景 |
| **卡片色阶** | `--s-card-accent`, `--s-card-stat`, `--s-card-chart`, `--s-card-list`, `--s-card-soft` | 5 级卡片视觉层级 |
| **极光背景** | `--aurora-1`, `--aurora-2`, `--aurora-3` | 三个径向渐变点 |
| **文字色** | `--t-heading`, `--t-body`, `--t-secondary`, `--t-muted`, `--t-inverse` | 文字层级 |
| **数据色** | `--c-income` (固定), `--c-expense` (固定), `--c-balance` | 收入/支出/结余颜色 |
| **反馈色** | `--c-warning`, `--c-danger`, `--c-success` | 警告/危险/成功 |

### 7.3 固定 vs 动态切换逻辑

在 `AppLayout` 中：

```
1. 清除所有主题类名 (FIXED_THEMES + DYNAMIC_MOODS)
2. 读取 settings.themeMode:
   - 'fixed': 添加 theme-{settings.fixedTheme}
   - 'dynamic': 根据 settings.colorScheme 计算 moodKey → 添加 theme-dynamic-{moodKey}
```

**动态心情计算（3 种策略）：**
- `most-frequent`（默认）：统计当月有心情标记的支出中出现次数最多的心情
- `latest`：当月有心情标记的支出中日期最新的一条的心情
- `adaptive`：按当天最后一条有心情的支出决定，如当天无记录则默认 neutral

### 7.4 React 集成类

| CSS 类 | 用途 |
|--------|------|
| `.bg-primary-gradient` | 主题渐变色按钮/强调块 |
| `.bg-primary` | 主题纯色背景 |
| `.bg-primary-soft` | 主题浅色背景（图标容器等） |
| `.text-accent` | 主题色文字 |
| `.btn-primary` | 主题渐变色按钮（含悬停效果） |
| `.btn-secondary` | 次要按钮 |
| `.btn-danger` | 危险操作按钮 |
| `.card-accent` | 带主题色调的品牌卡片 |
| `.card-stat` | 统计数据卡片 |
| `.card-chart` | 图表容器卡片 |
| `.card-list` | 列表/时间线卡片 |
| `.card-soft` | 空状态/柔和卡片 |
| `.glow-card` | 设置页 section 卡片（毛玻璃） |

---

## 8. 页面布局设计

### 8.1 整体布局

```
┌──────────────────────────────────────────┐
│ Sidebar (桌面固定/移动抽屉)  │  Header   │
│  ┌───────────────┐          │  ┌───────┐ │
│  │ 心情收支簿    │          │  │记一笔 │ │
│  ├───────────────┤          │  └───────┘ │
│  │ 📊 首页      │          ├────────────┤
│  │ 🧠 AI 助手   │          │            │
│  │ ⭐ 心愿      │          │  <main>    │
│  │ ⚙  设置      │          │  Outlet    │
│  └───────────────┘          │  Router    │
│                             │            │
│                             │            │
├─────────────────────────────┴────────────┤
│ BottomNav (移动端固定底部)               │
│  [首页] [AI] [心愿] [设置]              │
└──────────────────────────────────────────┘
  + ParticleNetwork Canvas (背景层)
  + Aurora 极光 (::before 伪元素)
```

### 8.2 首页 (Dashboard) 布局

从上到下：

```
┌─────────────────────────────────┐
│ 分账单切换器 (可选)              │
├─────────────────────────────────┤
│ 月份选择器                      │
├─────────────────────────────────┤
│ 心情 Banner (主题渐变 + 问候语) │
├─────────────────────────────────┤
│ 统计四象限 (收入/支出/结余/预算) │
├─────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐      │
│ │ 消费类型  │ │ 消费心情  │      │
│ │ Donut    │ │ Pie      │      │
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│ 14 日收支流 (双 Area Chart)     │
├─────────────────────────────────┤
│ 心情时间线 (14 天横向滚动)      │
│ ┌─┐ ┌─┐ ┌─┐ ...                │
│ │😊│ │😐│ │😢│                  │
│ └─┘ └─┘ └─┘                    │
├─────────────────────────────────┤
│ 月历热力图 (可选展开)           │
│ [支出]/[收入] 切换              │
│ 日一二三四五六                   │
│ _ 1  2  3  4  5  6              │
│ 7 8  9  10 11 12 13             │
│ ...                             │
│ 选中日期汇总                    │
├─────────────────────────────────┤
│ 交易筛选栏                      │
│ [全部][支出][收入] [心情下拉]   │
│ [分类下拉] [日期] — [日期]      │
│ [搜索框]                        │
├─────────────────────────────────┤
│ 交易列表 (按日期分组)           │
│ 汇总行: {n}笔 收¥x 支¥y 余¥z   │
│ 4月15日                         │
│  📦 必要消费  午餐   😊  -¥35.00│
│  📈 价值消费  课程   😌  -¥99.00│
│ 4月14日                         │
│  ...                            │
├─────────────────────────────────┤
│ FAB "+" (固定右下角)            │
└─────────────────────────────────┘
```

**无数据时：** 替代为欢迎卡片（消费五型介绍 + 三步开始指引 + "记第一笔" 按钮）。

### 8.3 AI 助手 (AIAssistant) 布局

```
┌─────────────────────────────────┐
│ Tab 栏                          │
│ [财务报告] [心理分析] [对话助手] │
├─────────────────────────────────┤
│ (对应 Tab 内容)                 │
└─────────────────────────────────┘

财务报告 Tab:
  ┌─────────────────────────────┐
  │ 统计卡 (支出/收入/预算/剩余) │
  ├─────────────────────────────┤
  │ 消费分类柱状图              │
  ├─────────────────────────────┤
  │ 预算进度条 (如有)           │
  ├─────────────────────────────┤
  │ [生成财务报告] 按钮         │
  ├─────────────────────────────┤
  │ AI 报告 (Markdown 渲染)     │
  │  [复制]                     │
  └─────────────────────────────┘

心理分析 Tab:
  ┌─────────────────────────────┐
  │ 统计卡 (支出/收入/预算/剩余) │
  ├─────────────────────────────┤
  │ 心情 × 消费柱状图           │
  ├─────────────────────────────┤
  │ [生成心理分析报告] 按钮     │
  ├─────────────────────────────┤
  │ AI 分析结果 (Markdown 渲染) │
  └─────────────────────────────┘

对话助手 Tab:
  ┌─────────────────────────────┐
  │ 数据概况 (支出/收入/预算)   │
  ├─────────────────────────────┤
  │ 对话区域 (滚动)             │
  │  用户气泡 (右, 主题渐变)   │
  │  AI 气泡 (左, 灰色)         │
  │  加载动画 (...)             │
  ├─────────────────────────────┤
  │ 快捷提问建议 (初始)         │
  ├─────────────────────────────┤
  │ 输入框 + 发送按钮           │
  │ [清除对话]                  │
  └─────────────────────────────┘
```

### 8.4 心愿 (JarPage) 布局

```
┌─────────────────────────────────┐
│ Tab 栏                          │
│ [心愿] [欲望冷却] [成长轨迹]    │
├─────────────────────────────────┤
│ (带淡入过渡动画的 Tab 内容)     │
└─────────────────────────────────┘

心愿 Tab:
  ┌─────────────────────────────┐
  │ [+ 创建心愿] (虚线按钮)     │
  │ 或 创建心愿表单             │
  ├─────────────────────────────┤
  │ 心愿卡片列表                │
  │  ┌───────────────────────┐  │
  │  │ 心愿名称 + 描述       │  │
  │  │ StarJar 环形进度      │  │
  │  │ ¥current / ¥target    │  │
  │  │ n 次守住 · x% 达成    │  │
  │  │ 星光浮动粒子          │  │
  │  └───────────────────────┘  │
  └─────────────────────────────┘

欲望冷却 Tab:
  ┌─────────────────────────────┐
  │ 冷却中事件 (蓝色标识)      │
  │  倒计时环形进度 + 剩余时间  │
  │  事件描述 + 金额 + 类型     │
  │  [提前守住] [删除]         │
  ├─────────────────────────────┤
  │ 等待确认事件 (琥珀色/呼吸) │
  │  事件描述 + 渴望/必要度     │
  │  [去看看] [删除]           │
  ├─────────────────────────────┤
  │ 空状态提示                 │
  ├─────────────────────────────┤
  │ [记录冲动] 按钮            │
  │ 或 记录冲动表单:           │
  │  - 描述文本区              │
  │  - 价格输入                │
  │  - AI 心理分析 按钮        │
  │  - AI 分析结果卡片         │
  │  - 关联心愿选择            │
  │  - 冷却时长选择            │
  │  - [开始冷却] 按钮         │
  └─────────────────────────────┘

重评估模态框:
  ┌─────────────────────────────┐
  │ "冷静之后，你的决定是？"    │
  │ 事件详情 (想买/价格/渴望)   │
  │ 当前渴望程度滑块 (1-5)      │
  │ 感受笔记                    │
  │ [守住它] (主题按钮)         │
  │ [还是想要] → 购买/再冷却   │
  │ [再冷静一下]                │
  └─────────────────────────────┘

成长轨迹 Tab:
  ┌─────────────────────────────┐
  │ 统计卡 (守住率/守住金额/星光)│
  ├─────────────────────────────┤
  │ 筛选 [全部][已守住][已释怀] │
  ├─────────────────────────────┤
  │ 事件时间线                  │
  │  🛡 事件描述  [已守住]     │
  │     ¥金额 · 心愿 · 日期     │
  │     反思笔记                │
  │  🔥 事件描述  [已释怀]     │
  │     ...                     │
  └─────────────────────────────┘
```

### 8.5 设置 (Settings) 布局

```
┌─────────────────────────────────┐
│ API 配置                        │
│  API Key / Base URL / 模型      │
│  [测试连接] [保存]              │
├─────────────────────────────────┤
│ 语音识别                        │
│  供应商切换 [百度]/[不使用]     │
│  API Key / Secret Key           │
│  百度智能云链接                 │
│  [保存语音配置]                 │
├─────────────────────────────────┤
│ 主题配色                        │
│  配色模式 [动态心情]/[固定配色] │
│  (动态) 跟随策略 3 选 1        │
│  (固定) 6 色块选择             │
├─────────────────────────────────┤
│ 月度预算                        │
│  当前预算显示                  │
│  [设/编] 金额 → 保存/删除      │
├─────────────────────────────────┤
│ 收支分类                        │
│  [+ 新建] 按钮                 │
│  新建表单: 支出/收入 + 图标 + 名称│
│  支出分类网格 (3-5 列, 可悬浮提示)│
│  收入分类网格                  │
├─────────────────────────────────┤
│ 分账单                          │
│  [+ 新建] 按钮                 │
│  新建表单: 图标 + 颜色 + 名称  │
│  分账单列表 (悬停显示删除按钮)  │
├─────────────────────────────────┤
│ 数据管理                        │
│  [导出全部 JSON]                │
│  [导出交易 CSV]                 │
│  [导入 JSON]                    │
│  ───────────                    │
│  [清除所有数据] (红色)          │
├─────────────────────────────────┤
│ 页脚: 心情收支簿 · 浏览器本地存储 │
└─────────────────────────────────┘
```

---

## 9. 组件层级与说明

```
App
├── SplashScreen (封面动画，sessionStorage 控制)
├── ParticleEffect (点击粒子溅射)
├── Routes
│   └── AppLayout (布局容器)
│       ├── ParticleNetwork (Canvas 背景粒子网络)
│       ├── Sidebar (桌面侧边栏)
│       │   └── NavLink × 4 (首页/AI/心愿/设置)
│       ├── Header (顶部栏)
│       │   └── AddModal (记账弹窗)
│       │       ├── 文字输入 → AI 解析 → 手动确认
│       │       ├── 语音录音 → 识别 → AI 解析
│       │       └── 手动分类选择
│       ├── BottomNav (移动端底部导航)
│       │   └── NavLink × 4
│       └── <Outlet />
│           ├── Dashboard (首页)
│           │   ├── ProjectSwitcher (分账单切换)
│           │   ├── 心情 Banner (动态问候 + 心情图标)
│           │   ├── 统计四象限卡片
│           │   ├── 消费类型 Donut + 消费心情 Pie
│           │   ├── 14 日收支流 AreaChart
│           │   ├── 心情时间线 (横向滚动)
│           │   ├── CalendarHeatmap (月历热力图)
│           │   ├── 交易筛选栏
│           │   ├── 交易列表 (按日期分组)
│           │   ├── 编辑/删除模态框
│           │   └── FAB "+" 按钮
│           ├── AIAssistant (AI 助手)
│           │   ├── ReportTab (财务报告)
│           │   │   ├── 统计卡
│           │   │   ├── BarChart (消费分类)
│           │   │   ├── 预算进度条
│           │   │   └── AI 报告 (Markdown → HTML)
│           │   ├── PsychTab (心理分析)
│           │   │   ├── 统计卡
│           │   │   ├── BarChart (心情 × 消费)
│           │   │   └── AI 分析结果
│           │   └── ChatTab (对话助手)
│           │       ├── 数据概况
│           │       ├── 对话消息列表
│           │       ├── 快捷提问按钮
│           │       └── 输入框 + 发送
│           ├── JarPage (心愿)
│           │   ├── GoalsTab (心愿)
│           │   │   ├── StarJar (SVG 环形进度 + 星光浮点)
│           │   │   │   └── Popup (星光详情)
│           │   │   └── 创建心愿表单
│           │   ├── EventsTab (欲望冷却)
│           │   │   ├── 冷却中列表 (倒计时环形)
│           │   │   ├── 等待确认列表
│           │   │   ├── 记录冲动表单
│           │   │   └── AI 分析结果卡片
│           │   ├── HistoryTab (成长轨迹)
│           │   │   ├── 统计卡 (守住率/金额/星光)
│           │   │   ├── 筛选按钮组
│           │   │   └── 事件时间线
│           │   └── 重评估模态框
│           └── Settings (设置)
│               ├── API 配置 Section
│               ├── 语音识别 Section
│               ├── 主题配色 Section
│               ├── 月度预算 Section
│               ├── 收支分类 Section
│               ├── 分账单 Section
│               └── 数据管理 Section
```

---

## 10. 视觉设计规范

### 10.1 色彩系统

**数据色（固定，不受主题影响）：**
- 收入：`#10b981`（翠绿）
- 支出：`#f43f5e`（玫红）
- 结余：跟随 `--c-primary`

**反馈色（固定）：**
- 警告：`#f59e0b`（琥珀）
- 危险：`#ef4444`（红色）
- 成功：`#22c55e`（绿色）

### 10.2 字体系统

采用 Inter 字体族，配合系统字体降级：

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

| 类名 | 字号 | 字重 | 用途 |
|------|------|------|------|
| `.h1` | 1.5rem (24px) | 700 | 页面主标题 |
| `.h2` | 1.25rem (20px) | 700 | Section 标题 |
| `.h3` | 0.9375rem (15px) | 600 | 子标题 |
| `.text-body` | 继承 | 400 | 正文 |
| `.text-secondary` | 继承 | 400 | 次要文字 |
| `.text-muted` | 继承 | 400 | 辅助文字 |
| `.amount` | 继承 | 600 + tabular-nums | 金额数字（等宽数字） |

### 10.3 卡片色阶（5 级视觉层级）

| 类名 | 用途 | 样式特征 |
|------|------|----------|
| `.card-accent` | 品牌强调（心愿卡片、AI 分析结果） | 主题色半透明背景 + 主题色边框 |
| `.card-stat` | 统计数据（四象限、统计卡） | 较高不透明度白色背景 |
| `.card-chart` | 图表容器 | 最高不透明度白色背景 + 较强边框 |
| `.card-list` | 列表/时间线（交易列表、事件时间线） | 柔和灰白色背景 |
| `.card-soft` | 空状态/柔和提示 | 最低不透明度背景 |

所有卡片基础样式：
- 毛玻璃效果：`backdrop-filter: blur(20px)`
- 圆角：`border-radius: 1.5rem`
- 阴影：浅色投影 + 大偏移投影

### 10.4 按钮系统

| 类名 | 样式 | 用途 |
|------|------|------|
| `.btn-primary` | 主题渐变背景 + 白色文字 + 橙色阴影 | 主要操作（保存、生成报告、守住） |
| `.btn-secondary` | 半透明背景 + 边框 + 正文色文字 | 次要操作（取消、返回） |
| `.btn-danger` | 红色背景 + 白色文字 + 红色阴影 | 危险操作（删除、清除数据） |
| `.btn-sm` | 小尺寸变体 (padding 0.375rem 0.75rem) | 行内按钮 |
| `.btn-xs` | 超小尺寸 (padding 0.25rem 0.625rem) | 微型按钮 |
| `.btn-icon` | 24×24 纯图标按钮 + 悬停时主题色 | 行内操作（删除、编辑、关闭） |
| `.btn-icon-danger` | 红色变体 | 删除图标按钮 |

### 10.5 图表规范

| 场景 | 图表类型 | 配置要点 |
|------|---------|----------|
| 消费类型分布 | Donut (环形图) | innerRadius=26, outerRadius=38, paddingAngle=2, 中心显示总金额 |
| 消费心情分布 | Pie (实心饼图) | outerRadius=38, paddingAngle=1 |
| 14 日收支流 | AreaChart (双面积图) | 收入绿色渐变填充, 支出红色渐变填充, dot=false, strokeWidth=1.5 |
| 支出分类排行 | BarChart (柱状图) | barSize=32, radius=[6,6,0,0], 自动生成颜色 |
| 心情 × 消费 | BarChart (柱状图) | barSize=36, 情绪色填充 |
| 冷却倒计时 | SVG Circle | strokeDasharray + strokeDashoffset 实现环形进度, filter glow 效果 |
| 心愿进度 | SVG Circle (StarJar) | 外圈主色进度 + 内圈渐变光泽 + 多圈星光浮点 |

### 10.6 动画规范

| 动画 | 关键帧 | 时长/缓动 | 用途 |
|------|--------|-----------|------|
| `slideUp` | translateY(20px) → 0, opacity 0→1 | 0.4s cubic-bezier(0.16,1,0.3,1) | 页面入场 |
| `fadeIn` | opacity 0→1 | 0.2s ease-out | 模态框背景 |
| `bounceIn` | scale(0)→1.1→1 | 0.55s cubic-bezier(0.68,-0.55,0.27,1.55) | 图标弹入 |
| `haloPulse` | box-shadow 脉冲扩张 | 2.5s ease-in-out infinite | 按钮光环 |
| `float` | translateY(0)→(-8px)→0 | 3.5s ease-in-out infinite | 图标浮动 |
| `breathe` | box-shadow 呼吸 | 2.5s ease-in-out infinite | 等待确认卡片 |
| `auroraShift` | opacity 0.8↔1 | 15s ease-in-out infinite | 极光背景 |
| `popIn` | scale(0.85)→1, opacity 0→1 | 0.25s cubic-bezier(0.34,1.56,0.64,1) | 弹窗出现 |
| `starFloat` | translateY 微动 | 3-4.5s (每星不同) | 星光粒子 |
| `sparklePop` | scale 放大→缩小+旋转, opacity 淡出 | 0.6s ease-out | 保存/守住确认 |
| `neonBorder` | background-position 旋转 | 4s linear infinite | 霓虹边框 |
| `fabShine` | background-position 移动 | 3s ease-in-out infinite | FAB 光泽 |
| `stagger` | 子元素延时 80ms × n | CSS animation-delay | 列表交错入场 |

---

## 11. 响应式设计规范

**断点：**
- `sm`: 640px（手机横屏）
- `md`: 768px（平板 / 桌面侧边栏显示）

**布局变化：**

| 元素 | < md (移动端) | ≥ md (桌面端) |
|------|---------------|---------------|
| 导航 | BottomNav 底部固定 | Sidebar 左侧固定 |
| Header 菜单按钮 | 显示 (打开 Sidebar 抽屉) | 隐藏 |
| 卡片网格 | 单列 / 双列 | 到 max-w-2xl/max-w-4xl 居中 |
| 记账 FAB | 显示 (固定右下角) | 显示 |
| 模态框 | 底部弹出 (rounded-t-3xl) | 居中 (rounded-3xl) |
| iOS 安全区 | `pb-safe` 增加底部 padding | `pb-safe` 恢复为 1rem |

**安全区适配：**
```css
.pb-safe { padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px)); }
@media (min-width: 768px) { .pb-safe { padding-bottom: 1rem; } }
```

---

## 12. 命名规范

**文件命名：**
- 组件：PascalCase（`AddModal.tsx`, `StarJar.tsx`）
- 工具/服务/lib：camelCase（`utils.ts`, `stats.ts`）
- 类型定义：`types/index.ts`
- 数据库：`db/index.ts`, `db/hooks.ts`

**CSS 类命名：**
- 采用语义化短横线命名：`.card-stat`, `.btn-primary`, `.text-accent`
- 避免使用 Tailwind 之外的自定义 utility 类

**TypeScript 接口：**
- 数据模型接口：PascalCase（`Transaction`, `Category`, `Budget`）
- 非持久化接口：PascalCase（`ParsedTransaction`, `CoolDownAIAnalysis`）
- 函数：camelCase（`parseTransaction`, `getMonthlyStats`）

**函数命名：**
- 数据获取：`use[TableName]()`（React Hook 风格）
- 工具函数：`verbNoun()`（`generateId`, `formatAmount`）
- 事件处理（组件内）：`h[Action]`（`hEdit`, `hSave`, `hDel`）- 缩写风格，仅 Dashboard
