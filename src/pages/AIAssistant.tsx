import { useState, useMemo, useRef, useEffect } from 'react'
import { useTransactions, useCategories, useChatMessages } from '@/db/hooks'
import { generateReport, chatQuery } from '@/services/llm'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { formatAmount, getCurrentYearMonth } from '@/lib/utils'
import { MOOD_LIST, BarChart3, Brain, MessageCircle, Copy, AlertTriangle, Trash2 } from '@/lib/icons'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const CHART_COLORS = ['#3b82f6','#10b981','#f43f5e','#f59e0b','#f97316','#ec4899','#06b6d4','#84cc16','#d97706','#14b8a6','#eab308','#78716c']
const SUGGESTIONS = ['我这个月开心的时候花了多少？', '焦虑时我最常买什么？', '帮我分析情绪和消费的关系', '给我一些改善消费习惯的建议']

export default function AIAssistant() {
  const [tab, setTab] = useState<'report' | 'chat' | 'psych'>('report')
  return (
    <div className="max-w-2xl mx-auto slide-up pb-safe">
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
  const { categories } = useCategories()
  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])
  const incomeBrk = useMemo(() => getCategoryBreakdown(transactions, categories, 'income', yearMonth), [transactions, categories, yearMonth])
  const [year, month] = yearMonth.split('-')

  const moodBarData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) { if (!t.mood || t.type !== 'expense') continue; map[t.mood] = (map[t.mood] || 0) + t.amount }
    return MOOD_LIST.filter(m => map[m.value]).map(m => ({ name: m.label, value: map[m.value] || 0, color: m.color })).sort((a,b) => b.value - a.value)
  }, [transactions])

  const handleGenerate = async () => {
    setLoading(true); setError(''); setReport('')
    const s = `交易: ${stats.count}\n收入: ${formatAmount(stats.totalIncome)}\n支出: ${formatAmount(stats.totalExpense)}\n结余: ${formatAmount(stats.balance)}\n\n支出分类:\n${breakdown.map(b => `- ${b.categoryName}: ${formatAmount(b.amount)} (${b.percentage}%)`).join('\n')}\n\n收入来源:\n${incomeBrk.map(b => `- ${b.categoryName}: ${formatAmount(b.amount)} (${b.percentage}%)`).join('\n')}`
    try { setReport(await generateReport(s, '', 'monthly', `${year}年${month}月`)) }
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
    <div className="space-y-3 sm:space-y-5">
      {/* Stats — nested inline */}
      <div className="card card-stat overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
          <div className="p-2.5 sm:p-3 text-center">
            <p className="text-[10px] text-muted">收入</p>
            <p className="text-sm font-bold mt-0.5">{formatAmount(stats.totalIncome)}</p>
          </div>
          <div className="p-2.5 sm:p-3 text-center">
            <p className="text-[10px] text-muted">支出</p>
            <p className="text-sm font-bold mt-0.5">{formatAmount(stats.totalExpense)}</p>
          </div>
          <div className="p-2.5 sm:p-3 text-center">
            <p className="text-[10px] text-muted">结余</p>
            <p className={`text-sm font-bold mt-0.5 ${stats.balance < 0 ? 'text-red-400' : ''}`}>{formatAmount(stats.balance)}</p>
          </div>
        </div>
      </div>

      {/* Consumption bar chart */}
      <div className="card card-chart p-5">
        <h3 className="text-xs font-semibold text-muted mb-3">支出分类</h3>
        {breakdown.length > 0 ? (
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={breakdown.slice(0,5)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                <XAxis dataKey="categoryName" tick={{fontSize:11,fill:'#a8a29e'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:'#a8a29e'}} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{fill:'rgba(0,0,0,0.03)',rx:8}} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.1)',fontSize:'12px',padding:'8px 14px'}} formatter={(v:number)=>(['¥'+v.toFixed(2),'金额'])} />
                <Bar dataKey="amount" radius={[6,6,0,0]} barSize={32} fillOpacity={0.85}>
                  {breakdown.slice(0,5).map((d,i)=>(<Cell key={d.categoryId} fill={CHART_COLORS[i%CHART_COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-xs text-muted text-center py-6">暂无消费数据</p>}
      </div>

      {/* Income bar chart */}
      <div className="card card-chart p-5">
        <h3 className="text-xs font-semibold text-muted mb-3">收入分类</h3>
        {incomeBrk.length > 0 ? (
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={incomeBrk.slice(0,5)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                <XAxis dataKey="categoryName" tick={{fontSize:11,fill:'#a8a29e'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:'#a8a29e'}} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{fill:'rgba(0,0,0,0.03)',rx:8}} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.1)',fontSize:'12px',padding:'8px 14px'}} formatter={(v:number)=>(['¥'+v.toFixed(2),'金额'])} />
                <Bar dataKey="amount" radius={[6,6,0,0]} barSize={32} fillOpacity={0.85}>
                  {incomeBrk.slice(0,5).map((d,i)=>(<Cell key={d.categoryId} fill={CHART_COLORS[(i+5)%CHART_COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-xs text-muted text-center py-6">暂无收入数据</p>}
      </div>

      {/* Generate button */}
      {error && <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm flex items-center gap-2"><AlertTriangle size={14} />{error}</div>}
      <button onClick={handleGenerate} disabled={loading || stats.count === 0}
        className="w-full py-3 rounded-2xl bg-primary-gradient text-white text-sm font-semibold disabled:opacity-50 hover:brightness-110 transition-all shadow-lg">
        {loading ? '分析中...' : stats.count === 0 ? '请先在首页记录收支' : '生成财务报告'}
      </button>

      {report && (
        <div className="card card-chart p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold tracking-tight">报告</h3><button onClick={() => navigator.clipboard.writeText(report)} className="text-xs text-accent font-medium flex items-center gap-1"><Copy size={13} />复制</button></div>
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

  const moodBarData = useMemo(() => moodData.map(m => ({ name: m.label, value: m.amount, count: m.count, color: m.color })).sort((a,b) => b.value - a.value), [moodData])

  const handleGenerate = async () => {
    setLoading(true); setError(''); setReport('')
    const ctx = `用户本月数据：收入 ${formatAmount(stats.totalIncome)} | 支出 ${formatAmount(stats.totalExpense)} | 交易 ${stats.count}笔\n\n心情-消费关联：\n${moodData.map(m => `- ${m.label}: ${m.count}次, ${formatAmount(m.amount)}, 涉及: ${m.categories.join('、') || '无'}`).join('\n')}\n\n请作为消费心理学顾问分析：1.不同情绪状态下的消费特征 2.是否存在情绪性消费迹象 3.哪类消费带来积极情绪 4.给出2-3条改善建议。语气温暖、共情。`
    try { setReport(await generateReport(ctx, '', 'monthly', `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`)) }
    catch (err: any) { setError(err.message || '失败') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Mood Bar Chart — vertical bars with custom colors */}
      <div className="card card-chart p-5">
        <h3 className="text-xs font-semibold text-muted mb-3">心情 × 消费</h3>
        {moodBarData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={moodBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{fontSize:11,fill:'#a8a29e'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:'#a8a29e'}} axisLine={false} tickLine={false} width={44} />
                <Tooltip cursor={{fill:'rgba(0,0,0,0.03)',rx:8}} contentStyle={{borderRadius:'14px',border:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.1)',fontSize:'12px',padding:'8px 14px'}} formatter={(v:number)=>(['¥'+v.toFixed(2),'消费金额'])} />
                <Bar dataKey="value" radius={[6,6,0,0]} barSize={36} fillOpacity={0.75}>
                  {moodBarData.map((entry,idx)=>(
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-xs text-muted text-center py-8">暂无心情数据</p>}
      </div>

      {/* Mood list with details */}
      <div className="card card-list p-4">
        <h3 className="text-xs font-semibold text-muted mb-3">详细数据</h3>
        {moodData.length > 0 ? (
          <div className="space-y-2">
            {moodData.map(m => (
              <div key={m.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/60 dark:bg-gray-800/40">
                <m.Icon size={20} strokeWidth={1.8} color={m.color} />
                <span className="flex-1 font-medium text-sm">{m.label}</span>
                <span className="text-muted text-xs">{m.count}笔</span>
                <span className="font-semibold text-accent dark:text-accent text-sm">{formatAmount(m.amount)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-muted text-center py-4">请先记录带心情的消费</p>}
      </div>

      {error && <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm flex items-center gap-2"><AlertTriangle size={14} />{error}</div>}
      <button onClick={handleGenerate} disabled={loading || moodData.length === 0}
        className="w-full py-3 rounded-2xl bg-primary-gradient text-white text-sm font-semibold disabled:opacity-50 hover:brightness-110 transition-all shadow-lg">
        {loading ? 'AI 分析中...' : moodData.length === 0 ? '请先记录带心情的消费' : '生成心理分析报告'}
      </button>

      {report && (
        <div className="card card-chart p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold tracking-tight">分析结果</h3><button onClick={() => navigator.clipboard.writeText(report)} className="text-xs text-accent font-medium flex items-center gap-1"><Copy size={13} />复制</button></div>
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

  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])

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
      {/* Data overview — 3 compact cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2 text-center">
          <p className="text-[9px] text-muted">收入</p>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatAmount(stats.totalIncome)}</p>
        </div>
        <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-2 text-center">
          <p className="text-[9px] text-muted">支出</p>
          <p className="text-xs font-bold text-rose-500 dark:text-rose-400">{formatAmount(stats.totalExpense)}</p>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-2 text-center">
          <p className="text-[9px] text-muted">结余</p>
          <p className={`text-xs font-bold ${stats.balance<0?'text-red-400':''}`}>{formatAmount(stats.balance)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[var(--c-primary-soft)] flex items-center justify-center mx-auto mb-5">
              <MessageCircle size={32} strokeWidth={1.2} className="text-accent" />
            </div>
            <p className="text-base font-semibold mb-1">我是你的 AI 心理记账助手</p>
            <p className="text-sm text-muted mb-6">可以问我收支、心情、消费习惯</p>
            <div className="text-left text-xs text-muted space-y-2 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 max-w-sm mx-auto">
              <p className="font-medium text-gray-500 mb-1">试试这样问我：</p>
              <p className="leading-relaxed">&ldquo;这个月我在焦虑情绪下花了多少？&rdquo;</p>
              <p className="leading-relaxed">&ldquo;冲动消费占总支出的比例？&rdquo;</p>
              <p className="leading-relaxed">&ldquo;给我减少情绪消费的建议&rdquo;</p>
            </div>
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary-gradient text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-800 rounded-bl-md'}`}>{msg.content}</div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3"><div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full pulse-dot" style={{ animationDelay: `${i*0.2}s` }} />)}</div></div></div>}
        <div ref={ref} />
      </div>
      {messages.length === 0 && <div className="flex flex-wrap gap-2 mb-3">{SUGGESTIONS.map(s => <button key={s} onClick={() => setInput(s)} className="px-3 py-2 text-xs rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white/50 backdrop-blur">{s}</button>)}</div>}
      {error && <div className="mb-2 p-2 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12} />{error}</div>}
      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="问点什么..." className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
        <button onClick={handleSend} disabled={!input.trim() || loading} className="px-5 py-3 rounded-2xl bg-primary-gradient text-white text-sm font-semibold disabled:opacity-50 shadow-lg">发送</button>
      </div>
      {messages.length > 0 && <button onClick={clearMessages} className="mt-2 text-xs text-gray-400 hover:text-gray-600 self-center flex items-center gap-1"><Trash2 size={12} />清除对话</button>}
    </div>
  )
}
