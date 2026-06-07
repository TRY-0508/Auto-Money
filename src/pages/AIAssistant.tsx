import { useState, useMemo, useRef, useEffect } from 'react'
import { useTransactions, useCategories, useBudgets, useChatMessages } from '@/db/hooks'
import { generateReport, chatQuery } from '@/services/llm'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { formatAmount, getCurrentYearMonth } from '@/lib/utils'
import { MOOD_LIST, BarChart3, Brain, MessageCircle, Copy, AlertTriangle, Trash2 } from '@/lib/icons'

const SUGGESTIONS = ['我这个月开心的时候花了多少？', '焦虑时我最常买什么？', '帮我分析情绪和消费的关系', '给我一些改善消费习惯的建议']

export default function AIAssistant() {
  const [tab, setTab] = useState<'report' | 'chat' | 'psych'>('report')
  return (
    <div className="max-w-2xl mx-auto slide-up">
      <div className="flex rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur p-1.5 mb-4">
        {[
          { key: 'report', Icon: BarChart3, label: '财务报告' },
          { key: 'psych', Icon: Brain, label: '心理分析' },
          { key: 'chat', Icon: MessageCircle, label: '对话助手' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
            <t.Icon size={18} strokeWidth={1.8} />{t.label}
          </button>
        ))}
      </div>
      {tab === 'report' ? <ReportTab /> : tab === 'psych' ? <PsychTab /> : <ChatTab />}
    </div>
  )
}

function ReportTab() {
  const [loading, setLoading] = useState(false); const [report, setReport] = useState(''); const [error, setError] = useState('')
  const yearMonth = getCurrentYearMonth(); const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories(); const { budgets } = useBudgets()
  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])
  const [year, month] = yearMonth.split('-')

  const handleGenerate = async () => {
    setLoading(true); setError(''); setReport('')
    const s = `交易: ${stats.count}\n收入: ${formatAmount(stats.totalIncome)}\n支出: ${formatAmount(stats.totalExpense)}\n结余: ${formatAmount(stats.balance)}\n\n支出分类:\n${breakdown.map(b => `- ${b.categoryName}: ${formatAmount(b.amount)} (${b.percentage}%)`).join('\n')}`
    const bi = budgets.length > 0 ? `预算:\n${budgets.map(b => { const c = categories.find(x => x.id === b.categoryId); return `${c?.name || '总预算'}: ${formatAmount(b.amount)}` }).join('\n')}` : '无预算'
    try { setReport(await generateReport(s, bi, 'monthly', `${year}年${month}月`)) }
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
      <div className="glow-card p-5">
        <h3 className="text-sm font-bold tracking-tight mb-4">财务概览 · {year}年{month}月</h3>
        <div className="grid grid-cols-2 gap-3 mb-4 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-orange-50/30 dark:from-gray-800 dark:to-orange-900/10">
          <div><p className="text-xs text-muted">本月支出</p><p className="text-sm font-bold">{formatAmount(stats.totalExpense)}</p></div>
          <div><p className="text-xs text-muted">本月收入</p><p className="text-sm font-bold">{formatAmount(stats.totalIncome)}</p></div>
          <div><p className="text-xs text-muted">交易笔数</p><p className="text-sm font-semibold">{stats.count} 笔</p></div>
          <div><p className="text-xs text-muted">结余</p><p className={`text-sm font-bold ${stats.balance < 0 ? 'text-red-400' : ''}`}>{formatAmount(stats.balance)}</p></div>
        </div>
        {error && <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm flex items-center gap-2"><AlertTriangle size={14} />{error}</div>}
        <button onClick={handleGenerate} disabled={loading || stats.count === 0}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold disabled:opacity-50 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20">
          {loading ? '分析中...' : stats.count === 0 ? '暂无数据' : '生成财务报告'}
        </button>
      </div>
      {report && (
        <div className="glow-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold tracking-tight">报告</h3><button onClick={() => navigator.clipboard.writeText(report)} className="text-xs text-amber-500 font-medium flex items-center gap-1"><Copy size={13} />复制</button></div>
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: md(report) }} />
        </div>
      )}
    </div>
  )
}

function PsychTab() {
  const [loading, setLoading] = useState(false); const [report, setReport] = useState(''); const [error, setError] = useState('')
  const yearMonth = getCurrentYearMonth(); const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()
  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])

  const moodData = useMemo(() => {
    const map: Record<string, { count: number; amount: number; categories: string[] }> = {}
    for (const t of transactions) { if (!t.mood || t.type !== 'expense') continue; if (!map[t.mood]) map[t.mood] = { count: 0, amount: 0, categories: [] }; map[t.mood].count++; map[t.mood].amount += t.amount; const cn = categories.find(c => c.id === t.categoryId)?.name; if (cn && !map[t.mood].categories.includes(cn)) map[t.mood].categories.push(cn) }
    return MOOD_LIST.filter(m => map[m.value]).map(m => ({ ...m, ...(map[m.value] || { count: 0, amount: 0, categories: [] }) }))
  }, [transactions, categories])

  const handleGenerate = async () => {
    setLoading(true); setError(''); setReport('')
    const ctx = `用户本月数据：收入 ${formatAmount(stats.totalIncome)} | 支出 ${formatAmount(stats.totalExpense)} | 交易 ${stats.count}笔\n\n心情-消费关联：\n${moodData.map(m => `- ${m.label}: ${m.count}次, ${formatAmount(m.amount)}, 涉及: ${m.categories.join('、') || '无'}`).join('\n')}\n\n请作为消费心理学顾问分析：1.不同情绪状态下的消费特征 2.是否存在情绪性消费迹象 3.哪类消费带来积极情绪 4.给出2-3条改善建议。语气温暖、共情。`
    try { setReport(await generateReport(ctx, '', 'monthly', `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`)) }
    catch (err: any) { setError(err.message || '失败') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="glow-card p-5">
        <h3 className="text-sm font-bold tracking-tight mb-4">消费心理分析</h3>
        {moodData.length > 0 && (
          <div className="space-y-3 mb-4 p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/50 dark:from-orange-900/20 dark:to-amber-900/20">
            <p className="text-xs text-gray-500 font-medium">心情×消费一览</p>
            {moodData.map(m => (
              <div key={m.label} className="flex items-center gap-2 text-sm">
                <m.Icon size={18} strokeWidth={1.8} /><span className="flex-1 font-medium">{m.label}</span>
                <span className="text-gray-400 text-xs">{m.count}笔</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs">{formatAmount(m.amount)}</span>
              </div>
            ))}
          </div>
        )}
        {error && <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm flex items-center gap-2"><AlertTriangle size={14} />{error}</div>}
        <button onClick={handleGenerate} disabled={loading || moodData.length === 0}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-semibold disabled:opacity-50 hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg shadow-amber-500/20">
          {loading ? 'AI 分析中...' : moodData.length === 0 ? '请先记录带心情的消费' : '生成心理分析报告'}
        </button>
      </div>
      {report && (
        <div className="glow-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold tracking-tight">分析结果</h3><button onClick={() => navigator.clipboard.writeText(report)} className="text-xs text-amber-500 font-medium flex items-center gap-1"><Copy size={13} />复制</button></div>
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: report.split('\n').map(l => {
            if (l.startsWith('### ')) return `<h3 class="text-base font-semibold mt-4 mb-2">${l.slice(4)}</h3>`
            if (l.startsWith('## ')) return `<h2 class="text-lg font-semibold mt-5 mb-2">${l.slice(3)}</h2>`
            if (l.startsWith('# ')) return `<h1 class="text-xl font-bold mt-5 mb-3">${l.slice(2)}</h1>`
            if (l.startsWith('- ')) return `<li class="ml-4 text-sm">${l.slice(2)}</li>`
            if (!l.trim()) return '<br/>'
            return `<p class="text-sm">${l}</p>`
          }).join('') }} />
        </div>
      )}
    </div>
  )
}

function ChatTab() {
  const { messages, addMessage, clearMessages } = useChatMessages()
  const [input, setInput] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const yearMonth = getCurrentYearMonth(); const { transactions } = useTransactions({ month: yearMonth }); const { categories } = useCategories()
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ctx = () => {
    const s = getMonthlyStats(transactions, yearMonth); const b = getCategoryBreakdown(transactions, categories, 'expense', yearMonth); const ib = getCategoryBreakdown(transactions, categories, 'income', yearMonth)
    const moodInfo = MOOD_LIST.filter(m => transactions.some(t => t.mood === m.value)).map(m => `${m.label}: ${transactions.filter(t => t.mood === m.value).length}次`).join('，')
    const [y, mm] = yearMonth.split('-')
    return `${y}年${mm}月 | 收入 ${formatAmount(s.totalIncome)} | 支出 ${formatAmount(s.totalExpense)} | 结余 ${formatAmount(s.balance)}\n支出: ${b.map(x => `${x.categoryName} ${formatAmount(x.amount)}(${x.percentage}%)`).join('，')}\n心情: ${moodInfo || '无'}`
  }

  const handleSend = async () => {
    const t = input.trim(); if (!t || loading) return
    setInput(''); setError(''); await addMessage({ role: 'user', content: t, timestamp: Date.now() }); setLoading(true)
    try { await addMessage({ role: 'assistant', content: await chatQuery(t, ctx()), timestamp: Date.now() }) }
    catch (err: any) { setError(err.message || '失败'); await addMessage({ role: 'assistant', content: '抱歉，请检查 API Key', timestamp: Date.now() }) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={48} strokeWidth={1} className="text-amber-400 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium">我是你的 AI 心理记账助手</p>
            <p className="text-gray-400 text-xs mt-1">可以问我收支、心情、消费习惯</p>
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-800 rounded-bl-md'}`}>{msg.content}</div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3"><div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full pulse-dot" style={{ animationDelay: `${i*0.2}s` }} />)}</div></div></div>}
        <div ref={ref} />
      </div>
      {messages.length === 0 && <div className="flex flex-wrap gap-2 mb-3">{SUGGESTIONS.map(s => <button key={s} onClick={() => setInput(s)} className="px-3 py-2 text-xs rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white/50 backdrop-blur">{s}</button>)}</div>}
      {error && <div className="mb-2 p-2 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12} />{error}</div>}
      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="问点什么..." className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
        <button onClick={handleSend} disabled={!input.trim() || loading} className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold disabled:opacity-50 shadow-lg shadow-amber-500/20">发送</button>
      </div>
      {messages.length > 0 && <button onClick={clearMessages} className="mt-2 text-xs text-gray-400 hover:text-gray-600 self-center flex items-center gap-1"><Trash2 size={12} />清除对话</button>}
    </div>
  )
}
