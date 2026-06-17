# 心情收支簿

基于消费心理学理论的 AI 智能记账工具。记录每一笔，看见情绪与金钱的隐秘关联。

## 特性

- **心理学记账体系**：支出五型（必要/价值/情绪/冲动/意外）+ 收入五型（劳动/增值/馈赠/惊喜/回流），基于 Kahneman 双系统、自我决定理论、心理账户等心理学理论
- **AI 自然语言记账**：一句话自动提取金额、心情、五型分类
- **百度语音识别**：点击录音，说话即可转文字记账
- **心愿 × 星光**：设定心愿 → 冲动冷却 → 守住获星光 → 积累填满心愿
- **冲动冷却系统**：AI 分析消费冲动 → 手动选择冷却期(6h~7d) → 到期重评估 → 守住或释怀
- **AI 财务报告 / 心理分析 / 对话**：三合一助手
- **月度预算**：预算跟踪 + 盈余转入心愿 + 亏空优先填平
- **数据可视化**：扇形图、柱状图、面积图、月历热力图、心情时间线
- **主题配色**：6 种固定配色 + 动态心情配色，全界面联动
- **数据自主**：所有数据存储在浏览器 IndexedDB，无需注册

## 快速开始

```bash
git clone https://github.com/TRY-0508/Auto-Money.git
cd Auto-Money
npm install
npm run dev
```

打开后进入「设置」→「API 配置」填入 DeepSeek API Key。

## 技术栈

React · TypeScript · Vite · Tailwind CSS · Dexie.js · Zustand · Recharts · OpenAI SDK

## 文档

| 文档 | 说明 |
|------|------|
| [项目概念](docs/idea.md) | 心理学理论基础 |
| [设计方案](docs/design-plan.md) | 总体设计架构 |
| [系统设计](docs/design.md) | 数据模型 + 流程 |
| [设计系统](docs/design-system.md) | 视觉设计规范 |
| [技术手册](docs/technical-manual.md) | 技术实现细节 |
| [实现状态](docs/workplan.md) | 当前版本状态 |

## License

MIT
