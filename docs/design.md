# 心情收支簿 — 系统设计

## 1. 页面架构

| 路由 | 页面 | 功能 |
|---|---|---|
| `/` | Dashboard | Bento 网格布局，心情 Banner + 统计 + 饼图 + 预算 + 时间线 + 月历 + 交易列表 |
| `/ai` | AI 助手 | 3 Tab：财务报告 / 心理分析 / 对话 |
| `/jar` | 心愿 | 3 Tab：心愿目标 / 欲望冷却 / 成长轨迹 |
| `/settings` | 设置 | API · 分类 · 预算 · 分账单 · 数据 |
| `[Modal]` | 记账弹窗 | 文字 AI / 语音按住 / 手动表单 + 心情 + 模板 |
| `[Splash]` | 封面页 | 首次/会话打开展示，浮动图标动画 |

## 2. 命名规范

| 概念 | 命名 | 动词/状态 |
|---|---|---|
| 长期储蓄目标 | **心愿** | 创建心愿、心愿达成 |
| 成功面对冲动 | **实现** | 守住冲动 |
| 获得标记 | **星光** | 收获星光 |
| 冷静后放弃购买 | **守住** | 已守住 |
| 冷静后仍想买 | **释怀** | 已释怀 / 已购买 |
| 冷静中 | **冷却中** | 冷却中 |
| 重评估 | **看看** | 去看看 |

## 3. 数据模型

### 3.1 心愿（JarGoal）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | UUID |
| name | string | 心愿名称 |
| targetAmount | number | 目标金额 |
| currentAmount | number | 已累积金额 |
| starCount | number | 星光数（守住次数） |
| description | string | 心愿描述/动机 |
| color | string | 主题色 |
| createdAt | number | 创建时间戳 |

### 3.2 冷却事件（CoolDownEvent）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | UUID |
| goalId | string? | 关联心愿 |
| description | string | 想买什么 |
| amount | number | 价格 |
| desireLevel | number | 渴望程度 1-5 |
| necessityLevel | number | 必要性 1-5 |
| emotionalState | string | 情绪状态 |
| impulseType | enum | 情绪消费 / 冲动消费 / 不确定 |
| cooldownHours | number | 冷却周期 |
| cooldownStartedAt | number | 冷却开始时间 |
| cooldownEndsAt | number | 冷却结束时间 |
| status | enum | cooling / pending_review / resisted / failed / purchased |
| aiAnalysis | object? | { impulseType, confidence, suggestedDesire, suggestedNecessity, riskFactors, suggestedCooldown, reflectionQuestions, summary } |
| reEvaluationNote / reEvaluationDesire / reEvaluationAt | 重评估数据 |
| earnedStar / earnedAt | 是否获得星光 |
| boughtAt | 购买时间 |

**状态流转**：
```
(新建) → cooling → pending_review
                       ├── resisted（守住 → 获星光+金额计入心愿）
                       └── failed
                              ├── purchased（释怀 → 标记已购买）
                              └── cooling（再次冷却）
```

### 3.3 原有数据模型

8 种心情（Lucide 图标）：开心·平静·一般·难过·焦虑·愤怒·兴奋·疲惫

11+6 预设分类

## 4. AI 辅助流程

### 欲望冷却创建时

```
用户自由描述（文本）
        ↓
AI 分析：消费类型 / 渴望度 / 必要性 / 风险因素 / 建议冷却 / 反思问题
        ↓
用户确认 → 开始冷却
```

### 冷却结束后重评估

```
展示原始记录 + AI 分析
        ↓
用户重评渴望程度 + 反思
        ↓
决定：守住 / 还是想要 / 再冷却
```

## 5. 心愿页面设计

### Tab 1：心愿目标
- 心愿卡片：名称 + 环形进度 + 星光环绕 + 金额进度
- 创建心愿（名称 + 金额 + 描述）
- 点击星光查看具体记录

### Tab 2：欲望冷却
- 冷却中列表（环形倒计时 → 蓝/橙/红）
- 待确认列表（呼吸边框高亮 + 「去看看」按钮）
- 新建按钮 → AI 分析表单

### Tab 3：成长轨迹
- 守住率 / 守住金额 / 星光总数
- 事件时间线（筛选：全部/已守住/已释怀）

## 6. 视觉设计

- 环形进度环（SVG donut chart）+ 星光有机分布
- 冷却环形倒计时（颜色渐变）
- 呼吸脉冲边框（待确认事件）
- 毛玻璃 Popup（缩放动画）
- 星光浮动动画 + hover 脉冲

## 7. 性能

- React.lazy 代码分割（4 路由独立 chunk）
- Canvas 粒子网络使用 requestAnimationFrame
- Ctrl+K 快捷记账
