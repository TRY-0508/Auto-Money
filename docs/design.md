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
| name | string | 目标名称，如「买 Switch」 |
| targetStars | number | 目标星星数 |
| currentStars | number | 当前星星数 |
| description | string? | 目标描述/动机 |
| color | string | 目标主题色 |
| createdAt | number | 创建时间戳 |

### 2.2 冷静事件（CoolDownEvent）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | UUID |
| goalId | string? | 关联的积攒目标（可暂无） |
| description | string | 想买的东西 |
| amount | number | 价格 |
| desireLevel | number | 渴望程度 1-5 |
| necessityLevel | number | 必要性评估 1-5 |
| emotionalState | string | 当前情绪状态描述 |
| impulseType | enum | 情绪消费 / 冲动消费 / 不确定 |
| reason | string | 想买的理由 |
| cooldownHours | number | 冷静周期（小时） |
| cooldownStartedAt | number | 冷静开始时间戳 |
| cooldownEndsAt | number | 冷静结束时间戳 |
| status | enum | cooling / pending_review / resisted / failed / purchased |
| reEvaluation | object? | 冷静后重新评估 { desireLevel, stillWant, note, timestamp } |
| earnedStar | boolean? | 是否获得星星 |
| earnedAt | number? | 获得星星时间 |
| boughtAt | number? | 购买时间 |
| createdAt | number | 创建时间戳 |

**状态流转**：
```
pending_review ──(设置冷静期)──→ cooling ──(到期)──→ pending_review
                                                     ├── 克制成功 → resisted (获得星星)
                                                     └── 克制失败 → failed
                                                            ├── 还是想买 → purchased (触发记账)
                                                            └── 再冷静一下 → cooling (重置冷静期)
```

### 2.3 原有数据模型（不变）

8 种心情（Lucide 图标 + 颜色）：开心 · 平静 · 一般 · 难过 · 焦虑 · 愤怒 · 兴奋 · 疲惫

11+6 预设分类（Lucide 图标 + 自动着色）：餐饮 交通 购物 游戏 娱乐 住房 医疗 教育 通讯 日用 其他 / 工资 兼职 理财 红包 报销 其他

## 3. 积攒瓶页面设计

### 3.1 Tab 1：积攒目标
- 目标卡片列表（名称 + 星星进度条 + 完成标记）
- 创建/编辑/删除目标
- 点击目标查看该目标下的克制记录

### 3.2 Tab 2：冷静事件
- 活跃事件列表（cooling 状态，显示倒计时）
- 待重评估列表（pending_review 状态，显示「去评估」按钮）
- 新建冷静事件按钮（FAB）
- 新建冷静事件表单：描述、金额、渴望度滑块、必要性滑块、情绪状态、冲动类型、理由、选择目标（可选）、冷静周期预设

### 3.3 Tab 3：历史统计
- 克制成功率（resisted / (resisted + failed)）
- 总克制金额（冷静后放弃购买的金额总和）
- 星星总数
- 冷静事件时间线（最近事件列表，成功/失败/已购买分类展示）

### 重评估弹窗
冷静期结束后点进事件 → 弹窗显示原始评估 + 提问「冷静之后，你还想要吗？」 → 当前渴望度滑块 + 反思笔记 → 选择「克制成功」或「我还是想买」或「再冷静一下」

### StarJar 可视化
- Canvas 渲染的瓶子 + 浮动星星
- 星星数量 = 该目标下成功克制的次数
- 目标达成时触发动效（瓶子发光 + 星星溢出）
- 支持多目标切换查看

## 4. 设计系统

### 色彩体系（CSS 自定义属性）

| Token | 色值 | 用途 |
|---|---|---|
| `--c-primary` | `#8b5cf6` | 品牌色 |
| `--c-income` | `#10b981` | 收入 |
| `--c-expense` | `#f43f5e` | 支出 |
| `--c-balance` | `#6366f1` | 结余 |
| `--t-heading` | `#1e293b` | 标题 |
| `--t-body` | `#334155` | 正文 |
| `--t-secondary` | `#64748b` | 次要文字 |

### 组件层级

| 类名 | 用途 |
|---|---|
| `.card` | 统一毛玻璃卡片（blur 24px） |
| `.card-hover` | 悬浮上浮 + 阴影 |
| `.tilt` | 3D 透视倾斜（perspective 800px） |
| `.bento` | Apple 风格网格布局（4 列） |
| `.stagger` | 子元素交错入场延迟 |
| `.btn` / `.btn-primary` / `.btn-icon` | 按钮三级体系 |
| `.input` / `.input-lg` | 输入框 |
| `.aurora-bg` | 三色渐变光晕背景（呼吸动画） |

### 特效系统

| 组件 | 技术 |
|---|---|
| ParticleNetwork | Canvas 粒子网络（80 颗，连线距离 120px） |
| ParticleEffect | 点击爆炸粒子（6 色，8 颗/次） |
| SplashScreen | 35 个浮动图标（心情 + 分类） |

## 5. Dashboard 布局（Bento Grid）

```
┌──────────────────────────────┐
│      Banner (full width)     │
├──────────────┬───────────────┤
│ 心情统计      │ 支出分类      │
│ (span 2)     │ (span 2)     │
├──────────────┴───────────────┤
│ 分类预算 + 时间线 + 月历     │
│ (full width cards)           │
├──────────────────────────────┤
│ 筛选 + 交易列表              │
│ (full width)                 │
└──────────────────────────────┘
```

## 6. 图标系统

全部使用 Lucide React SVG（无 emoji）：
- 心情 8 种：Smile / Heart / Meh / Frown / AlertTriangle / Angry / Star / Moon
- 分类 27 种可选
- 导航 4 种：LayoutDashboard / Brain / FlaskConical / Settings
- 操作 20+ 种
- 冷静事件专用：Timer / ShieldCheck / ShieldX / Thermometer / Clock / Hourglass

## 7. 性能

- React.lazy 代码分割（Dashboard / AI / Jar / Settings 独立 chunk）
- Suspense 加载骨架
- Canvas 粒子网络使用 requestAnimationFrame
- Ctrl+K 快捷记账
- 冷静事件定时器使用 requestAnimationFrame + 增量更新（不每秒重渲整个页面）
