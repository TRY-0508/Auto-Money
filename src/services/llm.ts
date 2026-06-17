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

- date: 日期 YYYY-MM-DD。今天是 ${today}。你必须根据用户的描述准确推断日期：
  * "今天" → ${today}
  * "昨天" → 今天的日期减1天
  * "前天" → 今天的日期减2天
  * "大前天" → 今天的日期减3天
  * "上周一/二/三/四/五/六/日" → 计算上周对应星期几的日期
  * "这周一/二/三/四/五/六/日" → 计算本周对应星期几的日期
  * "X月X日"或"X月X号" → 当前年份的该月该日
  * "X天前" → 今天减X天
  * 完全未提及时默认 ${today}
- description: 简短描述（5-20字）
- mood: 从用户描述中推断心情，可选值：happy/calm/neutral/sad/anxious/angry/excited/tired，无法判断时填 null
- confidence: 0-1 置信度

判断规则：
- "花了""买了""支付""消费"→ expense
- "收到""赚了""工资""入账"→ income
- "工资""奖金""薪水""月薪"→ 工资
- "兼职""副业""外快""打工"→ 兼职
- "理财""利息""收益""分红""租金"→ 理财
- "红包""礼物""爸妈给的"→ 红包

- 描述中有情绪词（开心、难过、焦虑、累、兴奋、愤怒、平静、疲惫）→ 据此推断 mood
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
  "深夜决策" "情绪补偿" "社交压力" "限时促销" "习惯性消费" "无聊驱动" "奖励心理" "从众效应" "稀缺错觉" "沉没成本" "生理饥饿" "即时满足"
- suggestedCooldown: 建议冷静小时数（1/3/6/12/24/48/72/168/336/720）
  你需要综合以下因素判断冷却时间：

  一、需求的紧迫性和时效性（非常重要！）：
  * 生理性即时需求（饿了想吃、渴了想喝、累了想休息）→ 极短冷却：1~3小时
  * 限时情境（看到限时折扣、直播闪购）→ 短冷却：3~6小时（够时间冷静即可）
  * 社交即时场景（朋友约饭、临时聚会）→ 短冷却：1~6小时
  * 可延迟的消费（想买新衣服但不是急需、想换个手机但旧手机还能用）→ 标准冷却：24~72小时
  * 纯情绪驱动且无时效性（深夜想买东西、心情不好想花钱）→ 较长冷却：48~168小时
  * 大额非必需消费（想买车、奢侈品、昂贵电子产品）→ 长冷却：168~720小时

  二、金额因素：
  * 小额（<50元）+ 低风险 → 偏向更短冷却
  * 中额（50-500元）+ 中等情绪驱动 → 标准冷却
  * 大额（>500元）+ 明显情绪驱动 → 更长冷却

  三、用户自我认知：
  * 用户描述中表现出犹豫、自嘲、理性分析 → 说明用户已有警觉，可适当缩短冷却
  * 用户描述狂热、急切、找理由说服自己 → 说明冲动强烈，应延长冷却

- reflectionQuestions: 2-3个引导用户反思的问题，针对具体情况个性化
- summary: 1-2句话简要分析

分析原则：
- 包含"突然""没忍住""半夜""刷到""直播间""优惠""限时""打折"→ 偏向冲动消费
- 包含"心情""犒劳""奖励""安慰""难过""累了""庆祝"等情绪词 → 偏向情绪消费
- 包含"饿了""馋了""想吃""想喝""困了""累了想"→ 生理性冲动，考虑短冷却
- 金额越大 + 情绪词越多 → 建议更长冷静期；需求越紧迫 → 建议更短冷静期
- 描述越详细、越理性 → 置信度越高
- 永远不要给出明显不符合时宜的冷却期（如：宵夜建议冷却2天是不合理的）

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
