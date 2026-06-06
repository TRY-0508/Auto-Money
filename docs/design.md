# 心情收支簿 — 系统设计

## 1. 页面架构

3 路由 + 1 弹窗 + 1 封面：

| 路由 | 页面 | 功能 |
|---|---|---|
| `/` | Dashboard | Bento 网格布局，心情 Banner + 统计 + 饼图 + 预算 + 时间线 + 月历 + 交易列表 |
| `/ai` | AI 助手 | 3 Tab：财务报告 / 心理分析 / 对话 |
| `/settings` | 设置 | API · 分类 · 预算 · 分账单 · 数据 |
| `[Modal]` | 记账弹窗 | 文字 AI / 语音按住 / 手动表单 + 心情 + 模板 |
| `[Splash]` | 封面页 | 首次/会话打开展示，浮动图标动画 |

## 2. 数据模型

8 种心情（Lucide 图标 + 颜色）：开心 · 平静 · 一般 · 难过 · 焦虑 · 愤怒 · 兴奋 · 疲惫

11+6 预设分类（Lucide 图标 + 自动着色）：餐饮 交通 购物 游戏 娱乐 住房 医疗 教育 通讯 日用 其他 / 工资 兼职 理财 红包 报销 其他

## 3. 设计系统

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

## 4. Dashboard 布局（Bento Grid）

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

## 5. 图标系统

全部使用 Lucide React SVG（无 emoji）：
- 心情 8 种：Smile / Heart / Meh / Frown / AlertTriangle / Angry / Star / Moon
- 分类 27 种可选
- 导航 3 种：LayoutDashboard / Brain / Settings
- 操作 20+ 种

## 6. 性能

- React.lazy 代码分割（Dashboard / AI / Settings 独立 chunk）
- Suspense 加载骨架
- Canvas 粒子网络使用 requestAnimationFrame
- Ctrl+K 快捷记账
