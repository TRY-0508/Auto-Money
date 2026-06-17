# 心情收支簿 — 系统设计

> 面向开发者的完整设计文档：架构、数据、页面、组件、视觉规范。

---

## 1. 产品定位

AI 驱动的消费心理学工具。帮助用户**看见消费心理模式、暂停冲动、清醒选择**。

核心隐喻：每次守住冲动 = 一束**星光** → 星光积累 → 点亮**心愿**。

## 2. 心理学理论体系

### 2.1 消费五型（Kahneman 双系统 + Dittmar 消费文化）

| 类型 | 驱动 | 说明 |
|------|------|------|
| 必要消费 | System 2 | 维持基本生存运转 |
| 价值消费 | System 2 | 对齐长期目标、自我成长 |
| 情绪消费 | System 1 | 情绪状态的消费投射 |
| 冲动消费 | System 1 | 无计划即时决策 |
| 意外消费 | 外部事件 | 突发不可控支出 |

### 2.2 收入五型（自我决定理论 + 心理账户 + 控制点）

| 类型 | 心理驱动 | 控制点 |
|------|---------|--------|
| 劳动收入 | 胜任感 | 内控 |
| 增值收入 | 远期规划 | 内控 |
| 馈赠收入 | 关系联结 | 外控 |
| 惊喜收入 | 意外之财 | 外控 |
| 回流收入 | 损失挽回 | 外控 |

### 2.3 欲望管理

| 机制 | 理论基础 |
|------|---------|
| 心愿 × 星光 | 延迟满足（Mischel）+ 执行意图（Gollwitzer） |
| 冲动冷却 | 自我控制资源模型 + 冲动衰减曲线 |
| 亏空优先 | 心理账户负债厌恶 |

---

## 3. 架构

```
Browser
 ├─ React SPA (HashRouter)
 │   ├─ Zustand (UI state)
 │   ├─ Recharts (charts)
 │   └─ Dexie.js → IndexedDB (9 tables)
 ├─ OpenAI SDK → DeepSeek API
 └─ 百度 REST API → 语音识别
     │
GitHub Pages (static hosting)
```

### 3.1 路由

| 路径 | 页面 | 功能 |
|------|------|------|
| `/` | Dashboard | Banner + 统计卡 + 扇形/柱状/面积图 + 时间线 + 月历 + 交易列表 |
| `/ai` | AIAssistant | 3 Tab：财务报告 / 心理分析 / 对话 |
| `/jar` | JarPage | 3 Tab：心愿 / 冷却 / 成长轨迹 |
| `/settings` | Settings | API · 语音 · 主题 · 分类 · 预算 · 分账单 · 数据 |

封面 SplashScreen 首次访问展示（sessionStorage 标记）。

---

## 4. 数据模型

### 4.1 交易 Transaction
- `type`: expense | income
- `amount`, `categoryId`, `date`, `description`, `mood`, `projectId`

### 4.2 分类 Category
- 系统预设：支出 5 型 + 收入 5 型（`isSystem: true`）
- 用户可创建自定义分类

### 4.3 预算 Budget
- `categoryId` (null = 总预算), `amount`, `yearMonth`
- 盈余 → 转入心愿；亏空 → 星光优先填平

### 4.4 亏空 Deficit
- `amount`, `yearMonth`, `remainingAmount`, `status`

### 4.5 心愿 JarGoal
- `name`, `targetAmount`, `currentAmount`, `starCount`, `color`

### 4.6 冷却事件 CoolDownEvent
```
新建 → cooling → pending_review
                    ├── resisted（守住 → 星光+金额）
                    └── failed（释怀/购买/再冷却）
```
冷却时间选项：6h / 12h / 1天 / 2天 / 3天 / 7天

### 4.7 设置 Settings
- API 配置、语音、主题配色(`themeMode`+`fixedTheme`/`colorScheme`)、暗色模式

---

## 5. AI 辅助流程

### 5.1 记账
```
自由文本 → parseTransaction()
  → System Prompt: 消费/收入心理学五型判断规则
  → 返回: type, amount, category, date, mood, confidence
  → 用户确认 → 写入 DB
```

### 5.2 冲动分析
```
自由描述 → analyzeCalmEvent()
  → 返回: impulseType, riskFactors, suggestedCooldown, reflectionQuestions
  → 用户选择冷却期 → 倒计时 → 重评估
```

### 5.3 报告/聊天
```
generateReport() — 月度数据 → Markdown 报告
chatQuery() — 带数据上下文的对话
```

---

## 6. 主题系统

### 6.1 配色模式

| 模式 | 说明 |
|------|------|
| 动态心情 | 3 策略：最多心情 / 最新消费 / 全天适应 |
| 固定配色 | 6 预设：暖琥珀 / 森绿 / 海蓝 / 玫瑰粉 / 薰衣草 / 日落橙 |

### 6.2 CSS 变量架构

```
:root              → 默认值
.theme-*           → 固定主题覆盖（6 种，各含 light+dark）
.theme-dynamic-*   → 动态心情覆盖（8 种）
.dark              → 暗色模式基础覆盖
```

每个主题定义完整链路：`--c-primary*` / `--s-page` / `--s-card-*` / `--aurora-*` / `--t-*`

### 6.3 卡片色阶（CSS 变量驱动）

| 类名 | 用途 | 变量 |
|------|------|------|
| `.card-accent` | 品牌强调 | `var(--s-card-accent)` |
| `.card-stat` | 统计数据 | `var(--s-card-stat)` |
| `.card-chart` | 图表容器 | `var(--s-card-chart)` |
| `.card-list` | 列表/时间线 | `var(--s-card-list)` |
| `.card-soft` | 空状态 | `var(--s-card-soft)` |

---

## 7. 视觉规范

### 7.1 色彩

- 品牌色：主题驱动（`--c-primary`），6 种固定 + 8 种动态
- 语义色：收入 `#10b981` / 警示 `#ef4444` / 支出=正文色+粗体（不与红色绑定）
- 同一卡片最多 2 种语义色

### 7.2 字体

`Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

| 层级 | 大小 | 粗细 | 用途 |
|------|------|------|------|
| H1 | 1.5rem | 700 | 页面标题 |
| H2 | 1.25rem | 700 | 区块标题 |
| H3 | 0.9375rem | 600 | 卡片标题 |
| Body | 0.875rem | 400 | 正文 |
| Amount | 继承 | 600 | 金额（tabular-nums） |

### 7.3 按钮

| 类型 | 类名 | 场景 |
|------|------|------|
| 主按钮 | `.btn-primary` | 页面主操作 |
| 次按钮 | `.btn-secondary` | 取消/返回 |
| 危险 | `.btn-danger` | 删除 |
| 图标 | `.btn-icon` | 行内小操作 |

### 7.4 图表

| 场景 | 形式 | 配色 |
|------|------|------|
| 五型消费 | Donut 环形图 | 12 色循环 |
| 心情×消费 | 横向柱状图 | 8 情绪色 |
| 收支趋势 | 面积图 | 绿/红渐变 |
| 预算 | 水平进度条 | 绿→黄→红 |

### 7.5 动画

| 动画 | 触发 | 时长 |
|------|------|------|
| slideUp | 页面进入 | 400ms |
| bounceIn | 重要元素 | 550ms |
| popIn | 弹窗 | 250ms |
| breathe | 待确认事件 | 2.5s 循环 |
| float | 星光/图标 | 3-4.5s 循环 |

### 7.6 命名哲学

| 传统 | 我们 | 理念 |
|------|------|------|
| 克制消费 | **守住** | 主动选择 |
| 克制失败 | **释怀** | 有意识的放手 |
| 积攒瓶 | **心愿** | 积累愿望 |
| 历史统计 | **成长轨迹** | 进化路线 |
| 超预算 | **亏空** | 可承认可填平 |

---

## 8. 设计原则

| 原则 | 含义 |
|------|------|
| **温和** | 不审判、不施压，暖色调、正面措辞 |
| **清晰** | 信息层次分明，字体大小/粗细形成自然层级 |
| **有层次** | 五级卡片色阶区分功能区 |
| **丰富** | 图表替代文字，但不堆砌 |
| **始终如一** | 同一语义同一颜色 |
