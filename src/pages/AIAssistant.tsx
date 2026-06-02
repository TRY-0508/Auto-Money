import { useState, useMemo, useRef, useEffect } from 'react'
import { useTransactions, useCategories, useBudgets, useChatMessages } from '@/db/hooks'
import { generateReport, chatQuery } from '@/services/llm'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { formatAmount, getCurrentYearMonth } from '@/lib/utils'

const SUGGESTIONS = ['这个月我花了多少钱？', '我在哪个分类花得最多？', '帮我分析一下这个月的支出', '这个月和上个月比怎么样？']

export default function AIAssistant() {
  const [tab, setTab] = useState<'report' | 'chat'>('report')
  return (
    <div className="max-w-2xl mx-auto slide-up">
      <div className="flex rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur p-1.5 mb-4">
        {[
          { key: 'report' as const, icon: '📊', label: '智能报告' },
          { key: 'chat' as const, icon: '💬', label: '对话助手' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'
            }`}>{t.icon} {t.label}</button>
        ))}
      </div>
      {tab === 'report' ? <ReportTab /> : <ChatTab />}
    </div>
  )
}

function ReportTab() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()
  const { budgets } = useBudgets()
  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])
  const [year, month] = yearMonth.split('-')

  const handleGenerate = async () => {
    setLoading(true); setError(''); setReport('')
    const summary = `总交易数: ${stats.count}\n总收入: ${formatAmount(stats.totalIncome)}\n总支出: ${formatAmount(stats.totalExpense)}\n结余: ${formatAmount(stats.balance)}\n\n支出分类明细:\n${breakdown.map(b => `- ${b.categoryName}: ${formatAmount(b.amount)} (${b.percentage}%)`).join('\n')}`
    const budgetInfo = budgets.length > 0 ? `预算:\n${budgets.map(b => { const c = categories.find(x => x.id === b.categoryId); return `- ${c?.name || '总预算'}: ${formatAmount(b.amount)}` }).join('\n')}` : '暂无预算'
    try { const r = await generateReport(summary, budgetInfo, 'monthly', `${year}年${month}月`); setReport(r) }
    catch (err: any) { setError(err.message || '失败') }
    finally { setLoading(false) }
  }

  const md = (t: string) => t.split('\n').map(l => {
    if (l.startsWith('### ')) return `<h3 class="text-base font-semibold mt-4 mb-2">${l.slice(4)}</h3>`
    if (l.startsWith('## ')) return `<h2 class="text-lg font-semibold mt-5 mb-2">${l.slice(3)}</h2>`
    if (l.startsWith('# ')) return `<h1 class="text-xl font-bold mt-5 mb-3">${l.slice(2)}</h1>`
    if (l.startsWith('- ')) return `<li class="ml-4 text-sm">${l.slice(2)}</li>`
    if (/^\d+\./.test(l)) return `<li class="ml-4 text-sm">${l.replace(/^\d+\.\s*/, '')}</li>`
    if (!l.trim()) return '<br/>'
    return `<p class="text-sm">${l}</p>`
  }).join('')

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5 shadow-sm border border-white/50 dark:border-gray-800/50">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5"><span>📊</span> {year}年{month}月 概况</h3>
        <div className="grid grid-cols-2 gap-3 mb-4 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50/50 dark:from-gray-800 dark:to-blue-900/20">
          <div><p className="text-xs text-gray-400">📤 支出</p><p className="text-sm font-bold text-red-400">{formatAmount(stats.totalExpense)}</p></div>
          <div><p className="text-xs text-gray-400">📥 收入</p><p className="text-sm font-bold text-green-400">{formatAmount(stats.totalIncome)}</p></div>
          <div><p className="text-xs text-gray-400">📋 交易</p><p className="text-sm font-semibold">{stats.count} 笔</p></div>
          <div><p className="text-xs text-gray-400">💎 结余</p><p className={`text-sm font-bold ${stats.balance >= 0 ? 'text-blue-500' : 'text-red-400'}`}>{formatAmount(stats.balance)}</p></div>
        </div>
        {error && <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm">⚠️ {error}</div>}
        <button onClick={handleGenerate} disabled={loading || stats.count === 0}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium disabled:opacity-50 hover:from-blue-600 hover:to-indigo-600 transition-all">
          {loading ? '🤖 AI 正在分析...' : stats.count === 0 ? '📭 暂无数据' : '✨ 生成 AI 分析报告'}
        </button>
      </div>
      {report && (
        <div className="glass rounded-3xl p-5 shadow-sm border border-white/50 dark:border-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><span>📝</span> 分析结果</h3>
            <button onClick={() => navigator.clipboard.writeText(report)} className="text-xs text-blue-500 hover:text-blue-600">📋 复制</button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: md(report) }} />
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
  const ref = useRef<HTMLDivElement>(null)
  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()

  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ctx = () => {
    const s = getMonthlyStats(transactions, yearMonth)
    const b = getCategoryBreakdown(transactions, categories, 'expense', yearMonth)
    const ib = getCategoryBreakdown(transactions, categories, 'income', yearMonth)
    const [y, m] = yearMonth.split('-')
    return `${y}年${m}月 收支：收入 ${formatAmount(s.totalIncome)} 支出 ${formatAmount(s.totalExpense)} 结余 ${formatAmount(s.balance)}\n支出: ${b.map(x => `${x.categoryName} ${formatAmount(x.amount)}(${x.percentage}%)`).join('，')}\n收入: ${ib.map(x => `${x.categoryName} ${formatAmount(x.amount)}(${x.percentage}%)`).join('，')}`
  }

  const handleSend = async () => {
    const t = input.trim(); if (!t || loading) return
    setInput(''); setError('')
    await addMessage({ role: 'user', content: t, timestamp: Date.now() })
    setLoading(true)
    try { const r = await chatQuery(t, ctx()); await addMessage({ role: 'assistant', content: r, timestamp: Date.now() }) }
    catch (err: any) { setError(err.message || '失败'); await addMessage({ role: 'assistant', content: '抱歉，请检查 API Key 配置~', timestamp: Date.now() }) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🤖</p>
            <p className="text-gray-500 text-sm font-medium">我是你的 AI 记账小助手</p>
            <p className="text-gray-400 text-xs mt-1">可以问我任何关于收支的问题~</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                msg.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
              }`}>{msg.content}</div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full pulse-dot" />
                <div className="w-2 h-2 bg-gray-400 rounded-full pulse-dot" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full pulse-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={ref} />
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="px-3 py-2 text-xs rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur transition-colors">{s}</button>
          ))}
        </div>
      )}

      {error && <div className="mb-2 p-2 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs">⚠️ {error}</div>}

      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="💬 问点什么..."
          className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <button onClick={handleSend} disabled={!input.trim() || loading}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium disabled:opacity-50 hover:from-blue-600 hover:to-indigo-600 transition-all">发送</button>
      </div>
      {messages.length > 0 && (
        <button onClick={clearMessages} className="mt-2 text-xs text-gray-400 hover:text-gray-600 self-center">🗑️ 清除对话</button>
      )}
    </div>
  )
}
