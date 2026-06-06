# 心情收支簿 — 系统设计

## 1. 技术栈

React 18 + TypeScript · Vite · Tailwind CSS · Dexie.js (IndexedDB) · Zustand · Recharts · Lucide React · OpenAI SDK

## 2. 页面架构

3 个路由 + 1 个全局弹窗：

```
/                Dashboard（首页）
/ai              AI 助手（心理分析 + 对话）
/settings        设置（API + 分类 + 预算 + 分账单 + 数据）
[全局 Modal]     记账弹窗（文字/语音/手动）
```

### 导航

| 平台 | 方式 |
|---|---|
| 桌面端 | 侧边栏（LayoutDashboard / Brain / Settings） |
| 移动端 | 底部标签栏（首页 / [+] / AI / 设置） |

## 3. 数据模型

### Transaction

```typescript
{
  id: string; type: 'expense'|'income'; amount: number
  categoryId: string; description: string; date: string
  createdAt: number; updatedAt: number
  mood?: string       // mood value: happy|calm|neutral|sad|anxious|angry|excited|tired
  projectId?: string  // optional project tag
}
```

### Category · Project · Budget · Settings · ChatMessage

标准 CRUD 模型。Category 的 `icon` 字段存储 Lucide 图标 key。Budget 绑定 `yearMonth` 实现按月独立。

## 4. 心情常量

```typescript
MOOD_LIST = [
  { value:'happy',   label:'开心', Icon:Smile,      color:'#f59e0b' },
  { value:'calm',    label:'平静', Icon:Heart,       color:'#0ea5e9' },
  { value:'neutral', label:'一般', Icon:Meh,         color:'#6b7280' },
  { value:'sad',     label:'难过', Icon:Frown,       color:'#6366f1' },
  { value:'anxious', label:'焦虑', Icon:AlertTriangle,color:'#f97316' },
  { value:'angry',   label:'愤怒', Icon:Angry,       color:'#ef4444' },
  { value:'excited', label:'兴奋', Icon:Star,        color:'#a855f7' },
  { value:'tired',   label:'疲惫', Icon:Moon,        color:'#8b5cf6' },
]
```

## 5. 设计系统

### 色彩体系

| Token | 用途 |
|---|---|
| `--c-primary` (#8b5cf6) | 品牌色、按钮、选中态 |
| `--c-income` (#10b981) | 收入 |
| `--c-expense` (#f43f5e) | 支出 |
| `--c-balance` (#6366f1) | 结余 |
| `--c-warning` (#f59e0b) | 预算紧张 |
| `--c-danger` (#ef4444) | 删除/错误 |

### 组件层级

- `.card` — 统一毛玻璃卡片（1.5rem 圆角 + blur + 阴影）
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-danger`
- `.btn-icon` — 20px 纯图标操作按钮
- `.input` — 统一输入框样式

### 心情响应

页面背景色和 Banner 渐变色根据主导心情自动切换（8 套配色）。默认（无心情数据时）为暖紫白色调。

## 6. Dashboard 布局

```
┌──────────────────────────┐
│ 月份选择 + 分账单切换     │
├──────────────────────────┤
│ 心情 Banner（渐变+数据）  │
├────────────┬─────────────┤
│ 心情统计    │ 支出分类    │
│ 彩虹条+胶囊 │ 饼图+列表   │
├────────────┴─────────────┤
│ 分类预算（可选）          │
│ 心情时间线（14天）        │
│ 月历热力图（可折叠）      │
│ 筛选 + 交易列表           │
└──────────────────────────┘
```

## 7. 部署

GitHub Pages + GitHub Actions 自动部署。HashRouter 解决 SPA 路由问题。
