import OpenAI from 'openai'
import { db } from '@/db'
import { decryptApiKey } from '@/lib/crypto'
import type { ParsedTransaction, CoolDownAIAnalysis } from '@/types'

async function getClient(): Promise<OpenAI | null> {
  const settings = await db.settings.get('default')
  if (!settings?.apiKey) return null

  const apiKey = await decryptApiKey(settings.apiKey)
  if (!apiKey) return null

  return new OpenAI({
    apiKey,
    baseURL: settings.apiBaseUrl || 'https://api.deepseek.com/v1',
    dangerouslyAllowBrowser: true,
  })
}

export async function parseTransaction(text: string): Promise<ParsedTransaction> {
  const client = await getClient()
  if (!client) throw new Error('API Key 未配置')

  const settings = await db.settings.get('default')
  const categories = await db.categories.toArray()
  const expenseCats = categories.filter((c) => c.type === 'expense').map((c) => c.name).join('、')
  const incomeCats = categories.filter((c) => c.type === 'income').map((c) => c.name).join('、')

  const today = new Date().toISOString().slice(0, 10)

  const response = await client.chat.completions.create({
    model: settings?.model || 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是消费心理学记账助手。从用户输入中提取以下字段，以 JSON 格式返回：

- type: "expense" 或 "income"
- amount: 数字金额（单位：元）
- category: 消费心理学五型分类之一

消费心理学五型分类（必须从以下选择最匹配的）：
  * 必要消费 — 维持生存和基本运转（房租、水电、基础饮食、通勤）
  * 价值消费 — 对齐长期目标和个人成长（课程、书籍、自我投资）
  * 情绪消费 — 由情绪状态驱动的消费（焦虑时暴食、开心请客、难过买衣服）
  * 冲动消费 — 无计划即时决策的消费（深夜刷直播下单、凑满减买不需要的东西）
  * 意外消费 — 突发意外不得不支出的消费（手机摔碎维修、突发急症看病、罚款缴费）

- date: 日期 YYYY-MM-DD，未提及时默认 ${today}
- description: 简短描述（5-15字）
- mood: 从用户描述中推断心情，可选值：happy/calm/neutral/sad/anxious/angry/excited/tired，无法判断时填 null
- confidence: 0-1 置信度

判断规则：
- "花了""买了""支付""消费"→ expense
- "收到""赚了""工资""入账"→ income
- 描述中有情绪词（开心、难过、焦虑、累）→ 据此推断 mood
- "冲动""没忍住""半夜""刷到""直播间"→ 冲动消费
- "必须""不得不""房租""水电""通勤"→ 必要消费
- "学习""课程""书""自我提升""投资自己"→ 价值消费
- "心情不好""犒劳""庆祝""安慰自己"→ 情绪消费
- "坏了""摔了""看病""急症""罚款""突发""意外""不得不修"→ 意外消费
- 金额出现多个时，取总和

只返回 JSON，不要其他内容。`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式异常')

  return JSON.parse(jsonMatch[0]) as ParsedTransaction
}

export async function generateReport(
  transactionsSummary: string,
  budgetSummary: string,
  periodType: 'weekly' | 'monthly',
  periodLabel: string
): Promise<string> {
  const client = await getClient()
  if (!client) throw new Error('API Key 未配置')

  const settings = await db.settings.get('default')

  const response = await client.chat.completions.create({
    model: settings?.model || 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是温暖的记账小助手，帮用户分析${periodType === 'weekly' ? '本周' : '本月'}的收支情况。

以下是${periodLabel}的交易数据和预算情况：
${transactionsSummary}
${budgetSummary}

请生成一份有人情味的财务报告，用 Markdown 格式，包含：
1. 一个亲切的总体评价（像朋友聊天）
2. 收支概览（总数+环比）
3. 支出排行 Top 3
4. 预算执行情况
5. 1-2 条实用小建议

语气温暖、鼓励，不要冷冰冰的数字罗列。`,
      },
    ],
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content || ''
}

export async function chatQuery(userMessage: string, dataContext: string): Promise<string> {
  const client = await getClient()
  if (!client) throw new Error('API Key 未配置')

  const settings = await db.settings.get('default')

  const response = await client.chat.completions.create({
    model: settings?.model || 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是 Auto Money 的智能记账助手，帮助用户查询和分析个人财务。

当前用户数据概览：
${dataContext}

规则：
- 只基于提供的数据回答，不编造
- 回答简洁，2-5 句
- 用温和友好的语气
- 涉及金额时精确到元`,
      },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.5,
  })

  return response.choices[0]?.message?.content || ''
}

export async function analyzeCalmEvent(description: string, amount: number): Promise<CoolDownAIAnalysis> {
  const client = await getClient()
  if (!client) throw new Error('API Key 未配置')

  const settings = await db.settings.get('default')

  const response = await client.chat.completions.create({
    model: settings?.model || 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是消费心理学分析助手。分析用户的购买冲动，以 JSON 格式返回分析结果。

字段说明：
- impulseType: "emotional"（情绪消费）、"impulsive"（冲动消费）、"uncertain"（不确定）
- confidence: 0-1 分类信心度
- suggestedDesire: 1-5 渴望程度（1=只是看看，5=魂牵梦萦）
- suggestedNecessity: 1-5 必要性（1=完全不必，5=确实需要）
- riskFactors: 风险因素数组，从以下选择最相关的（最多3个）：
  "深夜决策" "情绪补偿" "社交压力" "限时促销" "习惯性消费" "无聊驱动" "奖励心理" "从众效应" "稀缺错觉" "沉没成本"
- suggestedCooldown: 建议冷静小时数（24/48/72/168）
  24小时 - 小额、低风险
  48小时 - 中等金额或中等情绪驱动
  72小时 - 较大金额或明显情绪驱动
  168小时（7天）- 大额或高风险冲动
- reflectionQuestions: 2-3个引导用户反思的问题，针对具体情况个性化
- summary: 1-2句话简要分析

分析原则：
- 描述中包含"突然""没忍住""半夜""刷到""直播间""优惠""限时""打折"等 → 偏向冲动消费
- 描述中包含"心情""犒劳""奖励""安慰""难过""累了""庆祝"等情绪词 → 偏向情绪消费
- 金额越大 + 情绪词越多 → 建议更长冷静期
- 描述越详细、越理性 → 置信度越高

只返回 JSON，不要其他内容。`,
      },
      { role: 'user', content: `想买的东西：${description}\n价格：¥${amount}` },
    ],
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content || ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式异常')

  return JSON.parse(jsonMatch[0]) as CoolDownAIAnalysis
}
