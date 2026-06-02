import OpenAI from 'openai'
import { db } from '@/db'
import { decryptApiKey } from '@/lib/crypto'
import type { ParsedTransaction } from '@/types'

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
        content: `你是记账助手。从用户输入中提取以下字段，以 JSON 格式返回：
- type: "expense" 或 "income"
- amount: 数字金额（单位：元）
- category: 分类名称

可用支出分类：${expenseCats}
可用收入分类：${incomeCats}

- date: 日期，格式 YYYY-MM-DD，未提及时默认为 ${today}
- description: 简短描述（5-15字概括）
- confidence: 0-1 之间的置信度

判断规则：
"花了""买了""支付""消费"→ expense
"收到""赚了""工资""入账"→ income
金额出现多个时，取总和

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
