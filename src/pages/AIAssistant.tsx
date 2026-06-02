import { useState, useMemo, useRef, useEffect } from 'react'
import { useTransactions, useCategories, useBudgets, useChatMessages } from '@/db/hooks'
import { generateReport, chatQuery } from '@/services/llm'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { formatAmount, getCurrentYearMonth } from '@/lib/utils'

const CHAT_SUGGESTIONS = [
  '这个月我花了多少钱？',
  '我在哪个分类花得最多？',
  '帮我分析一下这个月的支出',
  '这个月和上个月比怎么样？',
]

export default function AIAssistant() {
  const [tab, setTab] = useState<'report' | 'chat'>('report')

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tab bar */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-4">
        <button
          onClick={() => setTab('report')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'report'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          📊 智能报告
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'chat'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          💬 对话助手
        </button>
      </div>

      {tab === 'report' ? <ReportTab /> : <ChatTab />}
    </div>
  )
}

function ReportTab() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [periodType] = useState<'monthly'>('monthly')

  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()
  const { budgets } = useBudgets()

  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(
    () => getCategoryBreakdown(transactions, categories, 'expense', yearMonth),
    [transactions, categories, yearMonth]
  )

  const [year, month] = yearMonth.split('-')

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setReport('')

    const periodLabel = `${year}年${month}月`
    const transactionsSummary = `
总交易数: ${stats.count}
总收入: ${formatAmount(stats.totalIncome)}
总支出: ${formatAmount(stats.totalExpense)}
结余: ${formatAmount(stats.balance)}

支出分类明细:
${breakdown.map((b) => `- ${b.categoryName}: ${formatAmount(b.amount)} (${b.percentage}%)`).join('\n')}
`
    const budgetSummary = budgets.length > 0
      ? `预算:\n${budgets.map((b) => {
          const cat = categories.find((c) => c.id === b.categoryId)
          return `- ${cat?.name || '总预算'}: ${formatAmount(b.amount)}`
        }).join('\n')}`
      : '暂无预算设置'

    try {
      const result = await generateReport(transactionsSummary, budgetSummary, periodType, periodLabel)
      setReport(result)
    } catch (err: any) {
      setError(err.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line) => {
        if (line.startsWith('### ')) return `<h3 class="text-base font-semibold mt-4 mb-2">${line.slice(4)}</h3>`
        if (line.startsWith('## ')) return `<h2 class="text-lg font-semibold mt-5 mb-2">${line.slice(3)}</h2>`
        if (line.startsWith('# ')) return `<h1 class="text-xl font-bold mt-5 mb-3">${line.slice(2)}</h1>`
        if (line.startsWith('- ')) return `<li class="ml-4 text-sm">${line.slice(2)}</li>`
        if (/^\d+\./.test(line)) return `<li class="ml-4 text-sm">${line.replace(/^\d+\.\s*/, '')}</li>`
        if (!line.trim()) return '<br/>'
        return `<p class="text-sm">${line}</p>`
      })
      .join('')
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-sm mb-4">{year}年{month}月 收支概况</h3>

        <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div>
            <p className="text-xs text-gray-400">支出</p>
            <p className="text-sm font-bold text-red-500">{formatAmount(stats.totalExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">收入</p>
            <p className="text-sm font-bold text-green-500">{formatAmount(stats.totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">交易笔数</p>
            <p className="text-sm font-semibold">{stats.count}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">结余</p>
            <p className={`text-sm font-bold ${stats.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatAmount(stats.balance)}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || stats.count === 0}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ AI 正在分析...' : stats.count === 0 ? '暂无数据' : '生成 AI 分析报告'}
        </button>
      </div>

      {report && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">分析结果</h3>
            <button
              onClick={() => navigator.clipboard.writeText(report)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              复制
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }} />
        </div>
      )}
    </div>
  )
}

function ChatTab() {
  const { messages, addMessage, clearMessages } = useChatMessages()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildDataContext = () => {
    const stats = getMonthlyStats(transactions, yearMonth)
    const breakdown = getCategoryBreakdown(transactions, categories, 'expense', yearMonth)
    const incomeBreakdown = getCategoryBreakdown(transactions, categories, 'income', yearMonth)

    const [year, month] = yearMonth.split('-')
    return `${year}年${month}月 收支概览：
总收入 ${formatAmount(stats.totalIncome)}
总支出 ${formatAmount(stats.totalExpense)}
结余 ${formatAmount(stats.balance)}

支出: ${breakdown.map((b) => `${b.categoryName} ${formatAmount(b.amount)}(${b.percentage}%)`).join('，')}
收入: ${incomeBreakdown.map((b) => `${b.categoryName} ${formatAmount(b.amount)}(${b.percentage}%)`).join('，')}`
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')
    await addMessage({ role: 'user', content: text, timestamp: Date.now() })

    setLoading(true)
    try {
      const context = buildDataContext()
      const reply = await chatQuery(text, context)
      await addMessage({ role: 'assistant', content: reply, timestamp: Date.now() })
    } catch (err: any) {
      setError(err.message || 'AI 回复失败')
      await addMessage({ role: 'assistant', content: '抱歉，我暂时无法回答。请检查 API Key。', timestamp: Date.now() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-gray-500 text-sm">问我任何关于收支的问题</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {CHAT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs">{error}</div>}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="问点什么..."
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          发送
        </button>
      </div>

      {messages.length > 0 && (
        <button onClick={clearMessages} className="mt-2 text-xs text-gray-400 hover:text-gray-600 self-center">
          清除对话
        </button>
      )}
    </div>
  )
}
