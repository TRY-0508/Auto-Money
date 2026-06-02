# Auto Money — 实现计划

## 实现原则

1. 先骨架后血肉：先搭好项目框架、路由、数据层，再逐页面填充功能
2. 核心功能优先：智能记账是核心体验，应最先完成并验证
3. 每阶段可运行：每个 Phase 结束都应有一个可运行、可演示的版本

---

## Phase 1：项目初始化与基础设施

### 1.1 项目脚手架
- [ ] 使用 Vite 创建 React + TypeScript 项目 (`npm create vite@latest . -- --template react-ts`)
- [ ] 安装依赖：`tailwindcss @tailwindcss/vite`, `react-router-dom`, `zustand`, `dexie`, `recharts`, `dayjs`, `openai`, `lucide-react`
- [ ] 配置 Tailwind CSS（`src/index.css`, `vite.config.ts`）
- [ ] 初始化 shadcn/ui (`npx shadcn@latest init`)，添加 button, input, dialog, select, sheet, toast 等组件
- [ ] 配置 React Router（`src/App.tsx`）
- [ ] 配置路径别名 `@/`（`vite.config.ts` + `tsconfig.json`）

### 1.2 类型定义
- [ ] 创建 `src/types/index.ts`：Transaction, Category, Budget, Settings, ChatMessage 等类型

### 1.3 数据层
- [ ] 创建 `src/db/index.ts`：Dexie 数据库实例，定义 transactions / categories / budgets / settings 表及索引
- [ ] 创建 `src/db/seed.ts`：12 个预设支出分类 + 6 个预设收入分类
- [ ] 创建 `src/db/hooks.ts`：封装 `useTransactions`, `useCategories`, `useBudgets`, `useSettings` Hook

### 1.4 工具函数
- [ ] `src/lib/constants.ts`：分类列表、默认设置
- [ ] `src/lib/utils.ts`：金额格式化、日期格式化、UUID 生成
- [ ] `src/lib/crypto.ts`：API Key 加解密（Web Crypto API）

### 1.5 布局与导航
- [ ] `src/pages/Dashboard.tsx` — 占位
- [ ] `src/pages/TransactionList.tsx` — 占位
- [ ] `src/pages/AddTransaction.tsx` — 占位
- [ ] `src/pages/Reports.tsx` — 占位
- [ ] `src/pages/Chat.tsx` — 占位
- [ ] `src/pages/Budget.tsx` — 占位
- [ ] `src/pages/Settings.tsx` — 占位
- [ ] `src/components/layout/BottomNav.tsx`：移动端底部导航栏
- [ ] `src/components/layout/Sidebar.tsx`：桌面端侧边栏导航
- [ ] `src/components/layout/AppLayout.tsx`：根据屏幕宽度切换 Sidebar/BottomNav
- [ ] `src/components/layout/Header.tsx`：页面标题 + 快速记账入口

### 1.6 部署配置
- [ ] `vite.config.ts` 配置 base 路径（`/auto-money/`）
- [ ] `public/404.html`：SPA fallback
- [ ] `.github/workflows/deploy.yml`：GitHub Actions 自动部署到 gh-pages 分支

**Phase 1 验证标准**：`npm run dev` 启动，7 个页面可路由跳转，移动端/桌面端导航正常，浏览器 DevTools → Application → IndexedDB 中可看到数据库和表。

---

## Phase 2：核心记账功能

### 2.1 分类管理
- [ ] `src/pages/Settings.tsx` 中实现 CategoryManager 区域
- [ ] 首次启动时调用 `seed.ts` 初始化预设分类
- [ ] 支持添加/编辑/删除自定义分类（系统分类不可删）
- [ ] 共享组件 `src/components/CategoryIcon.tsx`（emoji + 颜色圆点）
- [ ] 分类选择器组件（用于记账表单）

### 2.2 手动记账
- [ ] `src/pages/AddTransaction.tsx`：文字/语音模式切换
- [ ] 手动表单模式：类型切换(tab)、金额输入、分类选择器(网格)、日期选择器、描述输入
- [ ] 表单校验（金额 > 0，分类必选）
- [ ] 调用 `useTransactions().add()` 写入 IndexedDB
- [ ] 提交成功后 Toast 提示 + 跳转列表页

### 2.3 交易列表
- [ ] `src/pages/TransactionList.tsx`：按日期分组（今天/昨天/本周/本月/更早）
- [ ] `src/components/TransactionItem.tsx`：类型图标 + 分类图标 + 描述 + 金额
- [ ] 筛选栏：类型（全部/支出/收入）、分类下拉、月份切换
- [ ] 搜索：模糊匹配描述
- [ ] 左滑删除（移动端）/ 右键菜单（桌面端），带 ConfirmDialog
- [ ] 编辑：点击交易进入编辑模式，复用 AddTransaction 表单
- [ ] `src/components/EmptyState.tsx`：空状态插画 + 引导文案

**Phase 2 验证标准**：手动添加"午餐 25 元 餐饮"，列表中能看到并按日期分组排列，能编辑和删除。

---

## Phase 3：AI 智能记账

### 3.1 LLM Service
- [ ] `src/services/llm.ts`：封装 OpenAI SDK
  - 初始化 client（从 settings 读取 apiKey + baseUrl）
  - `parseTransaction(text)`：调用 LLM 解析记账文本，返回结构化数据
  - `generateReport(transactions, periodType)`：生成周报/月报
  - `chatQuery(userMessage, context)`：对话查询
- [ ] 每个方法做 try-catch，按设计文档 5.5 节的错误类型分别处理
- [ ] 解析响应 JSON（用正则提取，防止 markdown 代码块包裹）

### 3.2 提示词模板
- [ ] `src/prompts/parse-transaction.ts`
- [ ] `src/prompts/generate-report.ts`
- [ ] `src/prompts/chat-assistant.ts`

### 3.3 AI 解析记账流程
- [ ] `src/pages/AddTransaction.tsx` 文字模式：输入框 + "AI 解析"按钮
- [ ] 按钮点击 → loading 状态 → 调用 `parseTransaction()` → 展示 `ParsedResultCard`
- [ ] `ParsedResultCard`：展示 AI 解析出的 type/amount/category/date/description，每项可点编辑
- [ ] 用户确认 → 写入 DB + Toast 成功
- [ ] 用户取消/修改 → 进入手动表单模式预填 AI 结果

### 3.4 语音记账
- [ ] `src/services/speech.ts`：封装 Web Speech API
  - `startRecognition(lang)` → 返回 Promise<string>
  - 浏览器不支持时抛出特定错误
- [ ] `src/pages/AddTransaction.tsx` 语音模式：
  - 录音按钮 + 波形动画（CSS animation）
  - 录音结束 → 展示识别文本 → 自动调用 LLM 解析
  - 始终让用户确认后再保存

### 3.5 设置页 API Key 配置
- [ ] `src/pages/Settings.tsx` 中 ApiKeyConfig 区域
- [ ] API Key 输入框（密码类型）、Base URL、Model 选择
- [ ] 保存时用 `src/lib/crypto.ts` 加密存储
- [ ] "测试连接"按钮：发送简单请求验证 API Key 有效性
- [ ] 未配置 API Key 时，Dashboard 和记账页顶部显示引导横幅

**Phase 3 验证标准**：在设置页填入 DeepSeek API Key → 文字输入"中午吃牛肉面 25 块" → AI 解析返回 type=expense, amount=25, category=餐饮 → 确认保存成功。语音输入同理。

---

## Phase 4：仪表盘与数据展示

### 4.1 Dashboard
- [ ] `src/pages/Dashboard.tsx`
- [ ] OverviewCards：三张卡片——本月收入(绿)、本月支出(红)、本月结余(蓝/灰)
- [ ] RecentTransactions：最近 5 条交易列表（复用 TransactionItem）
- [ ] ExpenseChart：本月支出分类饼图（Recharts PieChart）
- [ ] TrendChart：近 30 天收支趋势柱状图（Recharts BarChart，收入绿/支出红）
- [ ] QuickAddButton：移动端右下角 FAB，点击跳转 `/add`
- [ ] 空状态：无交易时显示引导卡片"开始记第一笔账吧"

### 4.2 数据统计工具
- [ ] `src/lib/stats.ts`：按时间范围聚合、分类排行、环比计算
- [ ] `useTransactions` hook 添加统计查询方法：`getMonthlyStats()`, `getCategoryRanking()`

**Phase 4 验证标准**：Dashboard 展示本月数据概览，饼图和趋势图正确渲染，FAB 按钮跳转记账页。

---

## Phase 5：AI 报告与对话

### 5.1 AI 周期报告
- [ ] `src/pages/Reports.tsx`
- [ ] 报告类型选择：周报/月报切换
- [ ] 周期选择器：上一周/下一周，上一月/下一月
- [ ] "生成报告"按钮 → 从 DB 提取对应周期交易 → 调用 `generateReport()`
- [ ] 报告内容以 Markdown 渲染（分类染色、数据高亮）
- [ ] 加载态：AI 正在写报告的动画文案
- [ ] 导出报告为图片（html2canvas）或复制为文本

### 5.2 AI 对话助手
- [ ] `src/pages/Chat.tsx`
- [ ] 对话列表（用户消息右对齐、AI 消息左对齐）
- [ ] 输入框 + 发送按钮
- [ ] 建议问题（预设气泡，点击自动填入）：
  - "这个月我花了多少钱？"
  - "我在哪个分类上花的最多？"
  - "帮我对比这个月和上个月"
- [ ] 每次发送 → 查询 DB 获取数据上下文 → 调用 `chatQuery()`
- [ ] 加载态：AI 思考中的跳动点动画
- [ ] 对话历史存 IndexedDB（`src/db/index.ts` 添加 chatMessages 表）

**Phase 5 验证标准**：点击生成月报，AI 输出包含收支概览+排行+建议的 Markdown。Chat 中问"这个月花了多少钱"，返回正确数字。

---

## Phase 6：预算管理

### 6.1 预算 CRUD
- [ ] `src/pages/Budget.tsx`
- [ ] 总预算设置（月度总支出上限）
- [ ] 分类预算列表（每个支出分类可单独设预算）
- [ ] 预算进度条：`(已花金额 / 预算金额) * 100%`，颜色梯度（绿→黄→红）
- [ ] 超预算分类高亮提醒（红色边框 + 警告图标）
- [ ] 本月预算 vs 实际支出对比卡片

### 6.2 AI 预算建议
- [ ] Budget 页面"AI 建议"按钮
- [ ] 获取近 3 个月历史数据，调用 LLM 生成各分类的预算建议
- [ ] 展示建议列表，每项可点"采用"一键填入

**Phase 6 验证标准**：设置餐饮预算 2000 元，消费 1800 元显示 90% 进度条黄色，消费 2100 元显示红色超预算。

---

## Phase 7：辅助功能与优化

### 7.1 数据导入导出
- [ ] `src/services/export.ts`
- [ ] 导出全部数据为 JSON（transactions + categories + budgets + settings）
- [ ] 导入 JSON 文件恢复数据（先校验格式，合并策略可选覆盖/追加）
- [ ] 导出 CSV（仅 transactions，兼容 Excel 中文编码）

### 7.2 国际化
- [ ] 安装 `i18next` + `react-i18next`
- [ ] `src/i18n/locales/zh.json` + `en.json`
- [ ] 对所有用户可见文案做 i18n 包裹

### 7.3 体验优化
- [ ] `src/stores/uiStore.ts` 暗色模式切换 + 跟随系统
- [ ] `src/components/LoadingSkeleton.tsx`：Dashboard / List / Report 骨架屏
- [ ] `src/components/ConfirmDialog.tsx`：删除确认弹窗
- [ ] Toast 通知组件（shadcn/ui sonner）
- [ ] 页面切换过渡动画

**Phase 7 验证标准**：数据可导出 JSON/CSV 后重新导入还原，中英文切换正常，暗色模式切换正常。

---

## 预估时间

| Phase | 内容 | 预估 |
|---|---|---|
| Phase 1 | 基础设施 | 1-2 天 |
| Phase 2 | 核心记账 | 2-3 天 |
| Phase 3 | AI 智能记账 | 2-3 天 |
| Phase 4 | 仪表盘 | 1-2 天 |
| Phase 5 | AI 报告与对话 | 2-3 天 |
| Phase 6 | 预算管理 | 1-2 天 |
| Phase 7 | 辅助功能 | 1-2 天 |
