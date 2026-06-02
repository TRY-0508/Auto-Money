import { useState, useRef, useEffect } from 'react'
import { useTransactions, useCategories, useChatMessages } from '@/db/hooks'
import { chatQuery } from '@/services/llm'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'

const SUGGESTIONS = [
  '这个月我花了多少钱？',
  '我在哪个分类花得最多？',
  '帮我分析一下这个月的支出',
  '这个月和上个月比怎么样？',
]

export default function Chat() {
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
    const label = `${year}年${month}月`

    return `${label}收支概览：
总收入: ${formatAmount(stats.totalIncome)}
总支出: ${formatAmount(stats.totalExpense)}
结余: ${formatAmount(stats.balance)}

支出分类: ${breakdown.map((b) => `${b.categoryName} ${formatAmount(b.amount)}(${b.percentage}%)`).join('，')}
收入分类: ${incomeBreakdown.map((b) => `${b.categoryName} ${formatAmount(b.amount)}(${b.percentage}%)`).join('，')}`
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError('')
    const userMsg = { role: 'user' as const, content: text, timestamp: Date.now() }
    await addMessage(userMsg)

    setLoading(true)
    try {
      const context = buildDataContext()
      const reply = await chatQuery(text, context)
      await addMessage({ role: 'assistant', content: reply, timestamp: Date.now() })
    } catch (err: any) {
      setError(err.message || 'AI 回复失败')
      await addMessage({
        role: 'assistant',
        content: '抱歉，我暂时无法回答。请检查 API Key 配置是否正确。',
        timestamp: Date.now(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 10rem)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-gray-500 text-sm">我是你的 AI 记账助手</p>
            <p className="text-gray-400 text-xs mt-1">可以问我任何关于收支的问题</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
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
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 text-xs">
          {error}
        </div>
      )}

      {/* Input */}
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
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          发送
        </button>
      </div>

      {messages.length > 0 && (
        <button
          onClick={clearMessages}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 self-center"
        >
          清除对话
        </button>
      )}
    </div>
  )
}
