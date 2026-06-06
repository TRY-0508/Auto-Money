import { useState, useMemo, useEffect, useRef } from 'react'
import { useTransactions, useCategories, useProjects, useBudgets } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount, formatDate } from '@/lib/utils'
import { MOOD_LIST, MOOD_ICON_MAP, MOOD_COLOR_MAP, CATEGORY_ICON_MAP, MoreHorizontal, BarChart3, Trash2 } from '@/lib/icons'
import CategoryIcon from '@/components/CategoryIcon'
import EmptyState from '@/components/EmptyState'
import AddModal from '@/components/AddModal'
import ProjectSwitcher from '@/components/ProjectSwitcher'
import type { Transaction } from '@/types'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const BANNER_CLASS: Record<string, string> = {
  happy: 'banner-happy', calm: 'banner-calm', neutral: 'banner-neutral', sad: 'banner-sad',
  anxious: 'banner-anxious', angry: 'banner-angry', excited: 'banner-excited', tired: 'banner-tired',
}
const PAGE_CLASS: Record<string, string> = {
  happy: 'page-happy', calm: 'page-calm', neutral: 'page-neutral', sad: 'page-sad',
  anxious: 'page-anxious', angry: 'page-angry', excited: 'page-excited', tired: 'page-tired',
}

type FilterType = 'all' | 'expense' | 'income'

function CalendarHeatmap({ transactions, yearMonth, selectedDay, onSelectDay, onMonthChange }: {
  transactions: Transaction[]; yearMonth: string; selectedDay: string | null
  onSelectDay: (d: string | null) => void; onMonthChange: (ym: string) => void
}) {
  const [y, m] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstDay = new Date(y, m - 1, 1).getDay()
  const today = new Date().toISOString().slice(0, 10)
  const dailyTotals = useMemo(() => { const map: Record<string, number> = {}; for (const t of transactions) { if (t.type === 'expense') map[t.date] = (map[t.date] || 0) + t.amount } return map }, [transactions])
  const maxTotal = Math.max(...Object.values(dailyTotals), 1)
  const weeks: (number | null)[][] = []; let week: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) week.push(null)
  for (let d = 1; d <= daysInMonth; d++) { week.push(d); if (week.length === 7) { weeks.push(week); week = [] } }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week) }
  const getColor = (day: number | null, ds: string) => {
    if (day === null) return ''
    const t = dailyTotals[ds] || 0; if (t === 0) return 'bg-gray-100 dark:bg-gray-800 text-gray-400'
    const r = t / maxTotal; if (r > 0.66) return 'bg-red-400/80 dark:bg-red-600/80 text-white'; if (r > 0.33) return 'bg-orange-300/80 dark:bg-orange-600/80 text-white'
    return 'bg-yellow-200/80 dark:bg-yellow-700/80 text-gray-700'
  }
  const prev = () => { let ny = y, nm = m - 1; if (nm === 0) { nm = 12; ny-- }; onMonthChange(`${ny}-${String(nm).padStart(2, '0')}`) }
  const next = () => { let ny = y, nm = m + 1; if (nm === 13) { nm = 1; ny++ }; onMonthChange(`${ny}-${String(nm).padStart(2, '0')}`) }
  const tsRef = useRef(0)
  return (
    <div className="glow-card p-4" onTouchStart={e => { tsRef.current = e.touches[0].clientX }} onTouchEnd={e => { const d = tsRef.current - e.changedTouches[0].clientX; if (Math.abs(d) > 60) d > 0 ? next() : prev() }}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="p-1 text-gray-400 hover:text-violet-500 text-lg transition-colors">‹</button>
        <h3 className="text-sm font-semibold tracking-tight">月历</h3>
        <button onClick={next} className="p-1 text-gray-400 hover:text-violet-500 text-lg transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">{['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-center text-[10px] text-gray-400 font-medium">{d}</div>)}</div>
      {weeks.map((w, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {w.map((day, di) => {
            if (day === null) return <div key={di} />
            const ds = `${yearMonth}-${String(day).padStart(2, '0')}`
            const sel = selectedDay === ds
            const c = getColor(day, ds)
            const ring = sel ? 'ring-2 ring-violet-500 ring-offset-2 scale-110' : 'hover:scale-105'
            const todayRing = ds === today && !sel ? 'ring-1 ring-violet-400/50' : ''
            return <button key={di} onClick={() => onSelectDay(sel ? null : ds)} className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition-all ${c} ${ring} ${todayRing}`}>{day}</button>
          })}
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-gray-400"><span>少</span><div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" /><div className="w-3 h-3 rounded-sm bg-yellow-200/80 dark:bg-yellow-700/80" /><div className="w-3 h-3 rounded-sm bg-orange-300/80 dark:bg-orange-600/80" /><div className="w-3 h-3 rounded-sm bg-red-400/80 dark:bg-red-600/80" /><span>多</span>{selectedDay && <button onClick={() => onSelectDay(null)} className="ml-auto text-violet-500 font-medium">清除</button>}</div>
    </div>
  )
}

export default function Dashboard() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterMood, setFilterMood] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(getCurrentYearMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState(''); const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState(''); const [editCatId, setEditCatId] = useState('')
  const [editType, setEditType] = useState<'expense' | 'income'>('expense')
  const [editMood, setEditMood] = useState(''); const [editProjectId, setEditProjectId] = useState('')

  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [year, month] = yearMonth.split('-').map(Number)
  const { transactions: allTransactions, updateTransaction, deleteTransaction } = useTransactions({ month: yearMonth })
  const { categories } = useCategories(); const { projects } = useProjects(); const { budgets } = useBudgets()
  const transactions = useMemo(() => projectId ? allTransactions.filter(t => t.projectId === projectId) : allTransactions, [allTransactions, projectId])
  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const expenseBreakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])

  const moodStats = useMemo(() => {
    const map: Record<string, { count: number; totalSpent: number }> = {}
    for (const t of transactions) { if (!t.mood || t.type !== 'expense') continue; if (!map[t.mood]) map[t.mood] = { count: 0, totalSpent: 0 }; map[t.mood].count++; map[t.mood].totalSpent += t.amount }
    return MOOD_LIST.filter(m => map[m.value]).map(m => ({ ...m, ...map[m.value] })).sort((a, b) => b.count - a.count)
  }, [transactions])
  const dominantMood = moodStats[0]; const moodKey = dominantMood?.value || 'neutral'

  const budgetItems = useMemo(() => {
    const r: { cat: any; budget: any; spent: number; pct: number }[] = []
    for (const c of categories.filter(c => c.type === 'expense')) {
      const b = budgets.find(x => x.categoryId === c.id && x.yearMonth === yearMonth); if (!b) continue
      r.push({ cat: c, budget: b, spent: transactions.filter(t => t.categoryId === c.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0), pct: Math.round((transactions.filter(t => t.categoryId === c.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0) / b.amount) * 100) })
    }
    return r
  }, [categories, budgets, yearMonth, transactions])

  const moodTimeline = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (13 - i))
      const ds = d.toISOString().slice(0, 10); const dayTxs = transactions.filter(t => t.date === ds)
      const lastMood = dayTxs.filter(t => t.mood).pop()
      return { date: ds, label: i === 13 ? '今天' : i === 12 ? '昨天' : `${d.getMonth() + 1}/${d.getDate()}`, moodVal: lastMood?.mood || null, spent: dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) }
    })
  }, [transactions])

  const filtered = useMemo(() => {
    let data = transactions
    if (filterType !== 'all') data = data.filter(t => t.type === filterType)
    if (filterMood) data = data.filter(t => t.mood === filterMood)
    if (filterCategory) data = data.filter(t => t.categoryId === filterCategory)
    if (dateFrom) data = data.filter(t => t.date >= dateFrom); if (dateTo) data = data.filter(t => t.date <= dateTo)
    if (selectedDay) data = data.filter(t => t.date === selectedDay)
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); data = data.filter(t => t.description.toLowerCase().includes(q) || (categories.find(c => c.id === t.categoryId)?.name || '').toLowerCase().includes(q)) }
    return data
  }, [transactions, filterType, filterMood, filterCategory, dateFrom, dateTo, selectedDay, searchQuery, categories])
  const grouped = useMemo(() => { const g: Record<string, Transaction[]> = {}; for (const t of filtered) g[t.date] = [...(g[t.date] || []), t]; return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0])) }, [filtered])
  const calendarTransactions = useMemo(() => allTransactions.filter(t => t.date.startsWith(calendarMonth)), [allTransactions, calendarMonth])

  const handleEdit = (t: Transaction) => { setEditing(t); setEditAmount(String(t.amount)); setEditDesc(t.description); setEditDate(t.date); setEditCatId(t.categoryId); setEditType(t.type); setEditMood(t.mood || ''); setEditProjectId(t.projectId || '') }
  const handleSaveEdit = async () => { if (!editing) return; const a = parseFloat(editAmount); if (!a || a <= 0) return; await updateTransaction(editing.id, { amount: a, description: editDesc, date: editDate, categoryId: editCatId, type: editType, mood: editMood || undefined, projectId: editProjectId || undefined }); setEditing(null) }
  const handleDelete = async (id: string) => { await deleteTransaction(id); setDeleteId(null) }
  const expenseCats = categories.filter(c => c.type === 'expense'); const incomeCats = categories.filter(c => c.type === 'income'); const currentCats = editType === 'expense' ? expenseCats : incomeCats

  const hour = new Date().getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  const quotes: Record<string, string> = { happy: '开心的消费是给自己的礼物', calm: '平静的日子，理性的支出', sad: '难过的日子也要对自己温柔', anxious: '焦虑时停一停，深呼吸', angry: '愤怒时别做决定，先冷静', excited: '兴奋是好事，也别忘了理性', tired: '累了就休息，别用购物犒劳自己', neutral: '记录心情，认识自己' }
  const pageMoodClass = PAGE_CLASS[moodKey] || PAGE_CLASS.neutral; const bannerClass = BANNER_CLASS[moodKey] || BANNER_CLASS.neutral
  useEffect(() => { document.body.className = pageMoodClass; return () => { document.body.className = '' } }, [pageMoodClass])

  const DominantIcon = dominantMood?.Icon

  return (
    <div className="max-w-4xl mx-auto space-y-4 slide-up pb-24 md:pb-6">
      <ProjectSwitcher selectedId={projectId} onChange={setProjectId} />

      {/* Month Picker */}
      <select value={yearMonth} onChange={e => setYearMonth(e.target.value)} className="px-4 py-2 rounded-full glow-card text-sm font-semibold focus:outline-none cursor-pointer">
        {(() => { const o: { v: string; l: string }[] = []; const n = new Date(); for (let i = 0; i < 12; i++) { const d = new Date(n.getFullYear(), n.getMonth() - i, 1); o.push({ v: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, l: `${d.getFullYear()}年${d.getMonth() + 1}月` }) } return o })().map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>

      {/* ── Mood Banner ── */}
      <div className={`rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden ${bannerClass}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.1),transparent_40%)]" />
        <div className="absolute inset-0 deco-grid" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-sm tracking-wide uppercase font-medium">{greeting}</p>
              <h1 className="text-2xl font-bold mt-1 tracking-tight neon-text">心情收支簿</h1>
              <p className="text-white/60 text-xs mt-2 italic">{quotes[moodKey] || quotes.neutral}</p>
            </div>
            {DominantIcon && (
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 bounce-in">
                <DominantIcon size={44} strokeWidth={1.5} className="text-white drop-shadow-lg" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[{ l: '收入', v: formatAmount(stats.totalIncome), c: 'from-emerald-400/20 to-green-500/10' }, { l: '支出', v: formatAmount(stats.totalExpense), c: 'from-rose-400/20 to-red-500/10' }, { l: '结余', v: formatAmount(stats.balance), c: 'from-blue-400/20 to-indigo-500/10' }].map(card => (
              <div key={card.l} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center hover:bg-white/15 transition-colors">
                <p className="text-white/60 text-xs">{card.l}</p>
                <p className="text-base sm:text-lg font-bold mt-1">{card.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="glow-card p-10 text-center">
          <EmptyState icon={<BarChart3 size={48} strokeWidth={1.2} className="text-violet-400" />} title="开始认识自己" description="记下第一笔账，同步记录心情" action={{ label: '记一笔', onClick: () => setShowAdd(true) }} />
        </div>
      ) : (
        <>
          {/* ── Mood + Category ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mood Stats */}
            <div className="glow-card p-5 card-hover">
              <h3 className="text-sm font-bold tracking-tight mb-4">心情统计</h3>
              {moodStats.length > 0 ? (
                <div className="space-y-3">
                  {moodStats.map(m => {
                    const MoodIcon = m.Icon; const color = MOOD_COLOR_MAP[m.value] || '#6b7280'
                    return (
                      <div key={m.value} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: color + '20' }}>
                          <MoodIcon size={20} strokeWidth={1.8} color={color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1"><span className="font-semibold">{m.label}</span><span className="text-xs text-gray-400">{m.count}次 · {formatAmount(m.totalSpent)}</span></div>
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((m.totalSpent / moodStats[0].totalSpent) * 100, 100)}%`, backgroundColor: color }} /></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-sm text-gray-400 text-center py-6">记账时选心情，这里就会出现统计</p>}
            </div>

            {/* Category Pie */}
            <div className="glow-card p-5 card-hover">
              <h3 className="text-sm font-bold tracking-tight mb-4">支出分类</h3>
              {expenseBreakdown.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="w-28 h-28"><ResponsiveContainer><PieChart><Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={26} outerRadius={46} paddingAngle={3} dataKey="amount">{expenseBreakdown.map(e => <Cell key={e.categoryId} fill={e.categoryColor} strokeWidth={0} />)}</Pie></PieChart></ResponsiveContainer></div>
                  <div className="flex-1 space-y-2">{expenseBreakdown.slice(0, 5).map(item => <div key={item.categoryId} className="flex items-center gap-2 text-xs"><CategoryIcon categoryId={item.categoryId} size={14} /><span className="flex-1 font-medium truncate">{item.categoryName}</span><span className="text-gray-400 tabular-nums">{item.percentage}%</span></div>)}</div>
                </div>
              ) : <p className="text-sm text-gray-400 text-center py-6">暂无支出</p>}
            </div>
          </div>

          {/* ── Budget ── */}
          {budgetItems.length > 0 && (
            <div className="glow-card p-5 card-hover">
              <h3 className="text-sm font-bold tracking-tight mb-4">分类预算</h3>
              <div className="space-y-3">
                {budgetItems.map(({ cat, spent, pct }) => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <CategoryIcon categoryId={cat.id} size={16} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1"><span className="font-semibold">{cat.name}</span><span className="text-xs text-gray-400 tabular-nums">{formatAmount(spent)}</span></div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${pct > 100 ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                    </div>
                    <span className={`text-xs font-bold w-10 text-right tabular-nums ${pct > 100 ? 'text-red-500' : pct > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Mood Timeline ── */}
          <div className="glow-card p-4 card-hover overflow-hidden">
            <h3 className="text-sm font-bold tracking-tight mb-3">心情时间线</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {moodTimeline.map(d => {
                const MoodIcon = d.moodVal ? MOOD_ICON_MAP[d.moodVal] : null; const color = d.moodVal ? MOOD_COLOR_MAP[d.moodVal] : null
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-11">
                    <span className="text-[10px] text-gray-400 font-medium">{d.label}</span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${d.moodVal ? 'shadow-sm scale-100' : 'bg-gray-50 dark:bg-gray-800 scale-90'}`} style={d.moodVal && color ? { backgroundColor: color + '18' } : {}}>
                      {MoodIcon ? <MoodIcon size={18} strokeWidth={1.8} color={color || '#6b7280'} /> : <span className="text-gray-300 text-xs">—</span>}
                    </div>
                    {d.spent > 0 && <span className="text-[9px] text-gray-400 font-medium tabular-nums">¥{Math.round(d.spent)}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Calendar Toggle ── */}
          <button onClick={() => setShowCalendar(!showCalendar)} className="w-full text-xs font-medium text-violet-500 hover:text-violet-600 transition-colors">{showCalendar ? '收起月历 ▲' : '展开月历 ▼'}</button>
          {showCalendar && <CalendarHeatmap transactions={calendarTransactions} yearMonth={calendarMonth} selectedDay={selectedDay} onSelectDay={setSelectedDay} onMonthChange={setCalendarMonth} />}

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex rounded-full border border-gray-200/40 overflow-hidden bg-white/40 backdrop-blur">
              {(['all','expense','income'] as FilterType[]).map(t => <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 text-xs font-medium transition-all ${filterType === t ? 'bg-violet-500 text-white shadow-sm' : 'text-gray-500 hover:bg-white/60'}`}>{t === 'all' ? '全部' : t === 'expense' ? '支出' : '收入'}</button>)}
            </div>
            <select value={filterMood} onChange={e => setFilterMood(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs font-medium"><option value="">全部心情</option>{MOOD_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs font-medium"><option value="">全部分类</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs" />
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索" className="flex-1 min-w-[80px] px-3 py-1.5 rounded-full border border-gray-200/40 bg-white/40 backdrop-blur text-xs focus:outline-none focus:ring-2 focus:ring-violet-300" />
          </div>

          {/* ── Transaction List ── */}
          <div className="glow-card overflow-hidden">
            {grouped.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm font-medium">没有找到匹配的记录</div> : grouped.map(([date, items]) => (
              <div key={date}>
                <div className="px-5 py-2.5 bg-gradient-to-r from-gray-50/60 to-transparent dark:from-gray-800/40 text-xs font-semibold text-gray-500 flex justify-between">
                  <span>{formatDate(date)}</span>
                  <span className="text-gray-400 font-normal tabular-nums">收 ¥{items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(2)} 支 ¥{items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(2)}</span>
                </div>
                {items.map(t => {
                  const MoodIcon = t.mood ? MOOD_ICON_MAP[t.mood] : null; const color = t.mood ? MOOD_COLOR_MAP[t.mood] : null
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors cursor-pointer group border-b border-gray-50/40 dark:border-gray-800/20 last:border-0" onClick={() => handleEdit(t)}>
                      <CategoryIcon categoryId={t.categoryId} size={16} />
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{categories.find(c => c.id === t.categoryId)?.name || '未分类'}</p>{t.description && <p className="text-xs text-gray-400 truncate mt-0.5">{t.description}</p>}</div>
                      {MoodIcon && <MoodIcon size={16} strokeWidth={1.8} color={color || '#6b7280'} />}
                      <p className={`text-sm font-bold tabular-nums ${t.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>{t.type === 'expense' ? '-' : '+'}{formatAmount(t.amount)}</p>
                      <button onClick={e => { e.stopPropagation(); setDeleteId(t.id) }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Edit / Delete Modals ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 fade-in backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4 tracking-tight">编辑记录</h3>
            <div className="space-y-3">
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">{['expense','income'].map(t => <button key={t} onClick={() => setEditType(t as any)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${editType === t ? (t === 'expense' ? 'bg-red-400 text-white shadow-sm' : 'bg-emerald-400 text-white shadow-sm') : 'text-gray-500'}`}>{t === 'expense' ? '支出' : '收入'}</button>)}</div>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-300" />
              <div className="grid grid-cols-4 gap-2">{currentCats.map(c => { const Icon = CATEGORY_ICON_MAP[c.icon] || MoreHorizontal; return <button key={c.id} onClick={() => setEditCatId(c.id)} className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl text-xs transition-all ${editCatId === c.id ? 'bg-violet-50 dark:bg-violet-900/30 ring-2 ring-violet-400 scale-105 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}><Icon size={20} strokeWidth={1.8} className={editCatId === c.id ? 'text-violet-500' : 'text-gray-400'} /><span className="font-medium">{c.name}</span></button> })}</div>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="备注" className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              <div><p className="text-xs font-semibold text-gray-400 mb-2 tracking-wide uppercase">心情</p><div className="flex flex-wrap gap-1.5">{MOOD_LIST.map(m => { const MoodIcon = m.Icon; return <button key={m.value} onClick={() => setEditMood(editMood === m.value ? '' : m.value)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all ${editMood === m.value ? 'bg-violet-50 dark:bg-violet-900/30 ring-2 ring-violet-400 scale-105 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}><MoodIcon size={15} strokeWidth={1.8} /><span>{m.label}</span></button> })}</div></div>
              {projects.length > 0 && <select value={editProjectId} onChange={e => setEditProjectId(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium"><option value="">分账单（可选）</option>{projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}</select>}
              <div className="flex gap-2 pt-1"><button onClick={() => setEditing(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 font-semibold text-sm">取消</button><button onClick={handleSaveEdit} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-violet-500/20">保存</button></div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 fade-in backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-lg tracking-tight">确认删除</p><p className="text-gray-400 text-sm mt-1 mb-6">删除后无法恢复</p>
            <div className="flex gap-2"><button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 font-semibold text-sm">取消</button><button onClick={() => handleDelete(deleteId)} className="flex-1 py-3 rounded-2xl bg-red-400 text-white font-semibold text-sm shadow-lg shadow-red-400/20">删除</button></div>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button onClick={() => setShowAdd(true)} className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl shadow-2xl shadow-violet-500/30 halo-pulse flex items-center justify-center text-2xl z-40 hover:scale-110 active:scale-95 transition-all duration-200 font-light">+</button>
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}
