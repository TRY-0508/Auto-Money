# 心情收支簿 — 实现计划

## 重构原则

1. **心情优先**：心情数据和可视化是首页的第一视觉重心
2. **精简路由**：从 6 页缩减为 3 页（首页、AI、设置），记账改为全局弹窗
3. **代码少而精**：删除冗余页面，每个组件有明确职责

---

## Phase 0：设计方案评审 ✅

- [x] 确认 3+1 架构
- [x] 确认心情为核心数据维度
- [x] 确认预算降级、分账单移入设置

---

## Phase 1：重构页面架构

### 1.1 路由精简
- [ ] `App.tsx`：3 个路由 → `/` `/ai` `/settings`
- [ ] 删除旧页面文件：`Budget.tsx`、`TransactionList.tsx`、`AddTransaction.tsx`（改为 modal）
- [ ] 创建 `components/AddModal.tsx`：全局记账弹窗

### 1.2 导航更新
- [ ] `Sidebar.tsx`：首页 · AI 助手 · 设置
- [ ] `BottomNav.tsx`：首页 · [+] · AI · 设置（中间 + 为记账 FAB）
- [ ] `Header.tsx`：更新标题映射

---

## Phase 2：重写首页 Dashboard

### 2.1 心情图表区（上方，突出）
- [ ] Banner：紫色渐变 + 月收支概览
- [ ] 心情分布饼图 + 图例
- [ ] 心情×消费金额柱状图

### 2.2 分类图表区（下方，可折叠）
- [ ] 支出分类饼图 + 图例

### 2.3 日历热力图（可折叠）
- [ ] 月份切换 + 滑动
- [ ] 点击日期高亮筛选

### 2.4 交易流水 + 筛选
- [ ] 筛选栏：类型 / 日期范围 / 分类 / 心情 / 搜索
- [ ] 按日分组交易列表
- [ ] 每条显示心情 emoji
- [ ] 编辑弹窗（含心情修改）
- [ ] 删除确认

### 2.5 预算状态条（可选）
- [ ] 如果有预算数据，显示简洁进度条

---

## Phase 3：记账弹窗 AddModal

### 3.1 AI 文字解析
- [ ] 文本输入 → LLM 解析 → 确认 → 保存
- [ ] 解析结果展示（类型、金额、分类、日期、描述）

### 3.2 语音输入（按住说话）
- [ ] 按住录音 → 波形动画 → 松手解析

### 3.3 手动表单
- [ ] 类型切换
- [ ] 金额输入
- [ ] 分类网格 + 快捷新建
- [ ] **心情选择器**（8 种 emoji，位置显著）
- [ ] 分账单选择器
- [ ] 日期 + 备注

### 3.4 快捷模板
- [ ] 基于历史高频记录自动生成

---

## Phase 4：AI 助手页

### 4.1 心理分析 Tab
- [ ] 心情×消费一览表
- [ ] 生成心理分析报告（LLM 调用）
- [ ] Markdown 渲染结果

### 4.2 对话助手 Tab
- [ ] 保留现有对话功能
- [ ] 上下文增加心情数据
- [ ] 建议问题更新为心理学主题

---

## Phase 5：设置页

### 5.1 模块清单
- [ ] API 配置
- [ ] 收支分类管理（保留完整功能）
- [ ] 分账单管理
- [ ] 数据导入导出

---

## Phase 6：删除冗余

删除文件：
- `src/pages/Budget.tsx`
- `src/pages/TransactionList.tsx`
- `src/pages/AddTransaction.tsx`
- `src/components/TransactionItem.tsx`
- `src/components/CalendarHeatmap.tsx`（合并到 Dashboard 内）

---

## 预期文件清单

```
src/
├── App.tsx                        # 3 routes
├── main.tsx                       # entry
├── index.css                      # styles
├── types/index.ts                 # all types
├── lib/constants.ts, utils.ts, crypto.ts, stats.ts
├── db/index.ts, seed.ts, hooks.ts
├── stores/uiStore.ts, appStore.ts
├── services/llm.ts, speech.ts, export.ts
├── components/
│   ├── layout/ AppLayout, Sidebar, BottomNav, Header
│   ├── AddModal.tsx               # 全局记账弹窗
│   ├── CategoryIcon.tsx
│   ├── EmptyState.tsx
│   └── ProjectSwitcher.tsx
└── pages/
    ├── Dashboard.tsx              # 首页（心情+分类+日历+流水）
    ├── AIAssistant.tsx            # AI 助手（心理分析+对话）
    └── Settings.tsx               # 设置
```

相比之前删除 5 个页面文件，代码量减少约 30%。
