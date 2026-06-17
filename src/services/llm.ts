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

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const dayNum = now.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const todayWeekday = `星期${weekdays[now.getDay()]}`

  function offsetDate(days: number): string {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }
  const yesterday = offsetDate(-1)
  const dayBeforeYesterday = offsetDate(-2)
  const threeDaysAgo = offsetDate(-3)
  const lastWeekSameDay = offsetDate(-7)

  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1)
  const thisMonday = offsetDate(daysToMonday)

  const lastMonthDate = new Date(year, month - 2, dayNum)
  const lastMonthToday = lastMonthDate.toISOString().slice(0, 10)

  const dateReference = `今天是 ${today}（${todayWeekday}）：
昨天=${yesterday}  前天=${dayBeforeYesterday}  三天前=${threeDaysAgo}
上周=${lastWeekSameDay}  本周一=${thisMonday}  上月今天=${lastMonthToday}
"X月X号"→${year}-X月-X号  "这个月X号"→${year}-${String(month).padStart(2, '0')}-X号
未提及时默认${today}`

  const response = await client.chat.completions.create({
    model: settings?.model || 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是消费心理学记账助手。从用户输入中提取以下字段，以 JSON 格式返回：

- type: "expense" 或 "income"
- amount: 数字金额（单位：元）
- category: 消费/收入五型分类

对于支出，消费心理学五型分类（基于 Kahneman 双系统 + Dittmar 消费文化理论）：
  * 必要消费 — 维持生存和基本运转（房租、水电、基础饮食、通勤）
  * 价值消费 — 对齐长期目标和个人成长（课程、书籍、自我投资）
  * 情绪消费 — 由情绪状态驱动的消费（焦虑时暴食、开心请客、难过买衣服）
  * 冲动消费 — 无计划即时决策的消费（深夜刷直播下单、凑满减买不需要的东西）
  * 意外消费 — 突发意外不得不支出的消费（手机摔碎维修、突发急症看病、罚款缴费）

对于收入，常见收入分类：
  * 工资 — 固定劳动报酬（月薪、奖金）
  * 兼职 — 额外劳动所得（副业、外快）
  * 理财 — 被动投资收益（利息、分红、租金）
  * 红包 — 赠送性收入（红包、礼物、他人给的钱）
  * 其他 — 其他来源的收入

- date: 日期 YYYY-MM-DD
- description: 简短描述（5-20字），概括这笔收支的核心内容
- mood: 从用户描述的语气和用词中感知情绪倾向，可选值：happy/calm/neutral/sad/anxious/angry/excited/tired，无法判断时填 null
- confidence: 0-1 置信度。如果时间信息模糊（如"前几天"）或分类存在歧义，应相应降低

日期参考：
${dateReference}
注意：用户提到的时间必须对应上述参考日期（如"昨天买XX"→date=${yesterday}），不可全部默认为今天。金额出现多个时取总和。

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

  const now = new Date()
  const currentHour = now.getHours()
  const timeLabel = currentHour < 6 ? '凌晨' : currentHour < 12 ? '上午' : currentHour < 14 ? '中午' : currentHour < 18 ? '下午' : currentHour < 22 ? '晚上' : '深夜'

  const response = await client.chat.completions.create({
    model: settings?.model || 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是消费心理学分析助手。分析用户的购买冲动，以 JSON 格式返回。

当前时间：${timeLabel}（${currentHour}点）

字段说明：
- impulseType: 判断这笔消费主要由情绪驱动（"emotional"）、冲动决策（"impulsive"），还是难以归类（"uncertain"）
- confidence: 0-1 分类信心度，描述越详细置信度越高
- suggestedDesire: 1-5 渴望程度，从用户表述中感知其对这笔消费的渴求强度
- suggestedNecessity: 1-5 必要性，判断该消费解决的是真实需求还是一时欲望
- riskFactors: 风险因素数组，从以下选择最相关的（最多3个）：
  "深夜决策" "情绪补偿" "社交压力" "限时促销" "习惯性消费" "无聊驱动" "奖励心理" "从众效应" "稀缺错觉" "沉没成本" "生理驱动" "即时满足"
- suggestedCooldown: 建议冷静小时数（1/3/6/12/24/48/72/168/336/720）
- reflectionQuestions: 2-3个引导用户反思的问题。好的反思问题应帮助用户跳出当下冲动，从长远视角审视这笔消费
- summary: 1-2句话简要分析

冷却时间判断（综合考虑紧迫性、金额、情绪）：
- 生理即时需求 → 1-3h
- 社交/限时场景 → 3-12h
- 普通消费无明显时间压力 → 24-72h
- 情绪驱动消费 → 48-168h
- 大额非必需 → 168-720h
金额越大或情绪越强可适当延长，但冷却时间必须符合时宜：如宵夜给2天是不合理的。

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
