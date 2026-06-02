# Auto Money

AI 驱动的个人收支管理助手。说句话就能记账。

## 特性

- **自然语言记账**：输入"中午吃面花了15块"，AI 自动解析为结构化记录
- **语音记账**：支持浏览器语音输入，边说边记
- **AI 周报/月报**：自动生成有人情味的收支总结与建议
- **AI 对话查询**：像聊天一样查询你的财务数据
- **智能预算**：AI 根据历史数据推荐合理预算
- **数据自主**：所有数据存储在浏览器本地，无需注册

## 快速开始

### 前提

- Node.js >= 18
- 一个 LLM API Key（支持 OpenAI 及兼容接口）

### 安装

```bash
git clone https://github.com/<your-username>/auto-money.git
cd auto-money
npm install
npm run dev
```

### 使用

1. 打开 `http://localhost:5173`
2. 进入「设置」页面，填入你的 API Key
3. 点击「记账」，用文字或语音记录一笔收支

## 技术栈

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · Dexie.js · Zustand · Recharts

## 文档

- [项目概念](docs/idea.md)
- [系统设计](docs/design.md)
- [实现计划](docs/workplan.md)

## License

MIT
