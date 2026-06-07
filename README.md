# 心情收支簿

AI 驱动的消费心理助手。记录每一笔，看见情绪与金钱的隐秘关联。

## 特性

- **AI 自然语言记账**：一句话自动提取金额、心情、四型消费分类
- **百度语音识别**：点击录音，说话即可转文字记账（需配置百度语音 Key）
- **心愿 × 星光**：设定攒钱心愿 → 面对冲动时创建欲望冷却 → 冷静后守住得星光 → 星光积累填满心愿
- **欲望冷却系统**：AI 分析消费冲动（类型判定、风险因素、反思问题）→ 设定冷却期 → 到期重评估 → 守住或释怀
- **AI 财务报告 / 心理分析 / 对话**：三合一助手
- **心情可视化**：彩虹比例条、心情胶囊、支出饼图、心情时间线、月历热力图
- **数据自主**：所有数据存储在浏览器 IndexedDB，无需注册

## 快速开始

### 前提

- Node.js >= 18
- DeepSeek（或 OpenAI 兼容）API Key
- 百度语音 API Key（可选，用于语音记账）

### 安装

```bash
git clone https://github.com/TRY-0508/Auto-Money.git
cd Auto-Money
npm install
npm run dev
```

### 使用

1. 打开 `http://localhost:5173/Auto-Money/`
2. 进入「设置」→「API 配置」填入 DeepSeek API Key
3. 可选：「语音识别」填入百度 API Key + Secret Key
4. 记账：文字输入 → AI 解析，或语音 → 自动转文字 → AI 解析

## 技术栈

React · TypeScript · Vite · Tailwind CSS · Dexie.js · Zustand · Recharts · OpenAI SDK · Web Audio API · WebSocket

## 文档

- [项目概念](docs/idea.md)
- [系统设计](docs/design.md)
- [设计系统](docs/design-system.md)
- [实现计划](docs/workplan.md)

## License

MIT
