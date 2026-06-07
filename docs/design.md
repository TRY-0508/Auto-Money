# 心情收支簿 — 系统设计

## 1. 页面架构

4 路由 + 1 弹窗 + 1 封面：

| 路由 | 页面 | 功能 |
|---|---|---|
| `/` | Dashboard | Bento 网格布局，心情 Banner + 统计 + 饼图 + 预算 + 时间线 + 月历 + 交易列表 |
| `/ai` | AI 助手 | 3 Tab：财务报告 / 心理分析 / 对话 |
| `/jar` | 积攒瓶 | 3 Tab：积攒目标 / 冷静事件 / 历史统计 |
| `/settings` | 设置 | API · 分类 · 预算 · 分账单 · 数据 |
| `[Modal]` | 记账弹窗 | 文字 AI / 语音按住 / 手动表单 + 心情 + 模板 |
| `[Splash]` | 封面页 | 首次/会话打开展示，浮动图标动画 |

## 2. 数据模型

### 2.1 积攒目标（JarGoal）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | UUID |
| name | string | 目标名称 |
| targetAmount | number | 目标金额 |
| currentAmount | number | 已攒金额 |
| starCount | number | 累计星星数（克制次数） |
| description | string | 目标描述/动机 |
| color | string | 主题色 |
| createdAt | number | 创建时间戳 |

### 2.2 冷静事件（CoolDownEvent）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | UUID |
| goalId | string? | 关联目标 |
| description | string | 想买什么 |
| amount | number | 价格 |
| desireLevel | number | 渴望程度 1-5 |
| necessityLevel | number | 必要性 1-5 |
| emotionalState | string | 情绪状态 |
| impulseType | enum | 情绪消费 / 冲动消费 / 不确定 |
| reason | string | 想买的理由 |
| cooldownHours | number | 冷静周期 |
| cooldownStartedAt | number | 冷静开始时间 |
| cooldownEndsAt | number | 冷静结束时间 |
| status | enum | cooling / pending_review / resisted / failed / purchased |
| reEvaluationNote | string? | 冷静后反思 |
| reEvaluationDesire | number? | 冷静后渴望程度 |
| reEvaluationAt | number? | 重评估时间 |
| earnedStar | boolean? | 是否获得星星 |
| earnedAt | number? | 获得星星时间 |
| boughtAt | number? | 购买时间 |
| createdAt | number | 创建时间 |

**AI 评估附加字段**：
| 字段 | 类型 | 说明 |
|---|---|---|
| aiConfidence | number? | AI 分类信心度 0-1 |
| aiRiskFactors | string[]? | AI 识别的风险因素 |
| aiReflectionQuestions | string[]? | AI 生成的反思问题 |

**状态流转**：
```
(新建) → cooling → (到期) → pending_review
                                ├── 克制成功 → resisted (获星星 + 金额计入目标)
                                └── 克制失败 → failed
                                       ├── 标记购买 → purchased
                                       └── 再冷静 → cooling
```

### 2.3 原有数据模型

8 种心情（Lucide 图标 + 颜色）：开心 · 平静 · 一般 · 难过 · 焦虑 · 愤怒 · 兴奋 · 疲惫

11+6 预设分类（Lucide 图标 + 自动着色）：餐饮 交通 购物 游戏 娱乐 住房 医疗 教育 通讯 日用 其他 / 工资 兼职 理财 红包 报销 其他

## 3. AI 辅助评估流程

### 3.1 冷静事件创建时

```
用户自由描述（文本）
        ↓
调用 LLM（DeepSeek）分析：
  - 消费类型判定：情绪 / 冲动 / 不确定
  - 渴望程度建议：1-5（基于用词情绪强度）
  - 必要性初判：1-5
  - 风险因素：深夜决策 / 情绪补偿 / 社交压力 / 限时促销 / 习惯性消费
  - 建议冷静周期：基于类型和金额
  - 生成 2-3 个反思问题
        ↓
展示 AI 分析结果 → 用户确认或调整 → 开始冷静
```

### 3.2 冷静期结束后重评估

```
展示原始记录 + AI 分析
        ↓
用户重新评估渴望程度 + 写反思笔记
        ↓
决策：克制成功 / 还是想买 / 再冷静
```

## 4. 积攒瓶页面设计

### Tab 1：积攒目标
- 目标卡片：名称 + 金额进度条 + 星星数 + StarJar 可视化
- 创建目标（名称 + 金额 + 描述）
- 每个目标下展示关联的克制记录

### Tab 2：冷静事件
- 冷却中列表（倒计时卡片）
- 待评估列表（「去评估」按钮高亮）
- 新建按钮 → 表单：
  - 自由文本描述（主输入）
  - 价格
  - AI 分析按钮 → 展示分析结果 → 用户确认
  - 设定冷静周期

### Tab 3：历史统计
- 克制成功率 / 克制金额 / 总星星数
- 事件时间线（可筛选全部/成功/失败）

## 5. StarJar 可视化

纯 CSS 实现：
- 玻璃瓶轮廓（圆角矩形 + 椭圆瓶口）
- 金色液体填充（渐变，高度对应金额进度）
- 星星漂浮动画（SVG 五角星，随机位置 + 浮动动画 + 闪烁）
- 新增星星时触发抖动动画
- 目标达成时金光溢出

## 6. 设计系统

（不变，略）

## 7. 性能

- React.lazy 代码分割（4 路由独立 chunk）
- Canvas 粒子网络使用 requestAnimationFrame
- Ctrl+K 快捷记账
- AI 调用带 loading 态，不阻塞 UI
