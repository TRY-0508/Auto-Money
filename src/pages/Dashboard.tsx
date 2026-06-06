import { useState, useMemo, useRef } from 'react'
import { useTransactions, useCategories, useProjects, useBudgets } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount, formatDate } from '@/lib/utils'
import { MOODS } from '@/lib/constants'
import CategoryIcon from '@/components/CategoryIcon'
import EmptyState from '@/components/EmptyState'
import AddModal from '@/components/AddModal'
import ProjectSwitcher from '@/components/ProjectSwitcher'
import type { Transaction } from '@/types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const MOOD_COLORS = ['#a855f7', '#6366f1', '#94a3b8', '#38bdf8', '#f97316', '#ef4444', '#ec4899', '#14b8a6']
const MOOD_BG = ['mood-happy','mood-calm','mood-neutral','mood-sad','mood-anxious','mood-angry','mood-excited','mood-tired']

type FilterType = 'all' | 'expense' | 'income'

// ── Calendar ──
function CalendarHeatmap({ transactions, yearMonth, selectedDay, onSelectDay, onMonthChange }: any) {
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
  const getClass = (day: number | null, ds: string) => {
    if (day === null) return ''
    const t = dailyTotals[ds] || 0; if (t === 0) return 'bg-gray-100 dark:bg-gray-800 text-gray-400'
    const r = t / maxTotal; if (r > 0.66) return 'bg-red-400 dark:bg-red-600 text-white'; if (r > 0.33) return 'bg-orange-300 dark:bg-orange-600 text-white'
    return 'bg-yellow-200 dark:bg-yellow-700 text-gray-700 dark:text-gray-200'
  }
  const prev = () => { let ny = y, nm = m - 1; if (nm === 0) { nm = 12; ny-- }; onMonthChange(`${ny}-${String(nm).padStart(2, '0')}`) }
  const next = () => { let ny = y, nm = m + 1; if (nm === 13) { nm = 1; ny++ }; onMonthChange(`${ny}-${String(nm).padStart(2, '0')}`) }
  const tsRef = useRef(0)
  return (
    <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50" onTouchStart={e => { tsRef.current = e.touches[0].clientX }} onTouchEnd={e => { const d = tsRef.current - e.changedTouches[0].clientX; if (Math.abs(d) > 60) d > 0 ? next() : prev() }}>
      <div className="flex items-center justify-between mb-2"><button onClick={prev} className="p-1 text-gray-400 hover:text-gray-600 text-lg">‹</button><h3 className="text-sm font-semibold flex items-center gap-1"><span>📅</span>{y}年{m}月</h3><button onClick={next} className="p-1 text-gray-400 hover:text-gray-600 text-lg">›</button></div>
      <div className="grid grid-cols-7 gap-1 mb-1">{[ '日','一','二','三','四','五','六'].map(d => <div key={d} className="text-center text-[10px] text-gray-400">{d}</div>)}</div>
      {weeks.map((w, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {w.map((day, di) => {
            if (day === null) return <div key={di} />
            const ds = `${yearMonth}-${String(day).padStart(2, '0')}`
            const sel = selectedDay === ds
            return (
              <button
                key={di}
                onClick={() => onSelectDay(sel ? null : ds)}
                className={`aspect-square rounded-md flex items-center justify-center text-[11px] font-medium ${getClass(day, ds)} ${sel ? 'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-gray-900' : ''} ${ds === today && !sel ? 'ring-1 ring-violet-300' : ''}`}
              >
                {day}
              </button>
            )
          })}
        </div>
      ))}
      <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-gray-400"><span>少</span><div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" /><div className="w-3 h-3 rounded-sm bg-yellow-200 dark:bg-yellow-700" /><div className="w-3 h-3 rounded-sm bg-orange-300 dark:bg-orange-600" /><div className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-600" /><span>多</span>{selectedDay && <button onClick={() => onSelectDay(null)} className="ml-auto text-violet-500 text-[10px]">清除</button>}</div>
    </div>
  )
}

// ── Dashboard ──
export default function Dashboard() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterMood, setFilterMood] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(getCurrentYearMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showCharts, setShowCharts] = useState(true)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState(''); const [editDesc, setEditDesc] = useState(''); const [editDate, setEditDate] = useState('')
  const [editCatId, setEditCatId] = useState(''); const [editType, setEditType] = useState<'expense' | 'income'>('expense')
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
    return MOODS.filter(m => map[m.value]).map(m => ({ ...m, count: map[m.value]?.count || 0, totalSpent: map[m.value]?.totalSpent || 0 })).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [transactions])

  const dominantMood = moodStats.length > 0 ? moodStats[0] : null
  const moodBgClass = dominantMood ? MOOD_BG[MOODS.findIndex(m => m.value === dominantMood.value)] || '' : ''

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 6 ? '夜深了 🌙' : hour < 12 ? '早上好 ☀️' : hour < 18 ? '下午好 🌤️' : '晚上好 🌆'
  const moodMsg = dominantMood ? `你最近的心情以「${dominantMood.emoji} ${dominantMood.label}」为主` : '记录心情，认识自己 💜'
  const moodTip = dominantMood && dominantMood.value === 'anxious' ? '焦虑时不妨试试散步或深呼吸 🌿'
    : dominantMood && dominantMood.value === 'sad' ? '难过的日子也要对自己好一点 🫂'
    : dominantMood && dominantMood.value === 'excited' ? '保持这份热情，但也别冲动消费哦 🎉'
    : dominantMood && dominantMood.value === 'happy' ? '开心的每一天都值得记录 ✨'
    : '记一笔账，同步记录心情吧'

  // Filters
  const filtered = useMemo(() => {
    let data = transactions
    if (filterType !== 'all') data = data.filter(t => t.type === filterType)
    if (filterMood) data = data.filter(t => t.mood === filterMood)
    if (filterCategory) data = data.filter(t => t.categoryId === filterCategory)
    if (dateFrom) data = data.filter(t => t.date >= dateFrom)
    if (dateTo) data = data.filter(t => t.date <= dateTo)
    if (selectedDay) data = data.filter(t => t.date === selectedDay)
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); data = data.filter(t => t.description.toLowerCase().includes(q) || (categories.find(c => c.id === t.categoryId)?.name || '').toLowerCase().includes(q)) }
    return data
  }, [transactions, filterType, filterMood, filterCategory, dateFrom, dateTo, selectedDay, searchQuery, categories])
  const grouped = useMemo(() => { const g: Record<string, Transaction[]> = {}; for (const t of filtered) g[t.date] = [...(g[t.date] || []), t]; return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0])) }, [filtered])
  const calendarTransactions = useMemo(() => allTransactions.filter(t => t.date.startsWith(calendarMonth)), [allTransactions, calendarMonth])

  const budgetStats = useMemo(() => {
    let totalBud = 0; const cats = categories.filter(c => c.type === 'expense')
    for (const c of cats) { const b = budgets.find(x => x.categoryId === c.id && x.yearMonth === yearMonth); if (b) totalBud += b.amount }
    return totalBud
  }, [budgets, categories, yearMonth])

  const handleEdit = (t: Transaction) => { setEditing(t); setEditAmount(String(t.amount)); setEditDesc(t.description); setEditDate(t.date); setEditCatId(t.categoryId); setEditType(t.type); setEditMood(t.mood || ''); setEditProjectId(t.projectId || '') }
  const handleSaveEdit = async () => { if (!editing) return; const a = parseFloat(editAmount); if (!a || a <= 0) return; await updateTransaction(editing.id, { amount: a, description: editDesc, date: editDate, categoryId: editCatId, type: editType, mood: editMood || undefined, projectId: editProjectId || undefined }); setEditing(null) }
  const handleDelete = async (id: string) => { await deleteTransaction(id); setDeleteId(null) }
  const expenseCats = categories.filter(c => c.type === 'expense'); const incomeCats = categories.filter(c => c.type === 'income'); const currentCats = editType === 'expense' ? expenseCats : incomeCats

  return (
    <div className="max-w-4xl mx-auto space-y-3 slide-up pb-4">
      <ProjectSwitcher selectedId={projectId} onChange={setProjectId} />

      {/* Month + toggle */}
      <div className="flex items-center gap-2">
        <select value={yearMonth} onChange={e => setYearMonth(e.target.value)} className="px-3 py-1.5 rounded-full border border-white/40 bg-white/40 backdrop-blur text-sm font-medium">
          {(() => { const o: { v: string; l: string }[] = []; const n = new Date(); for (let i = 0; i < 12; i++) { const d = new Date(n.getFullYear(), n.getMonth() - i, 1); o.push({ v: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, l: `${d.getFullYear()}年${d.getMonth() + 1}月` }) } return o })().map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <button onClick={() => setShowCharts(!showCharts)} className="ml-auto text-xs text-violet-500 hover:text-violet-600 font-medium">{showCharts ? '收起 ▲' : '展开 ▼'}</button>
      </div>

      {/* Greeting Banner */}
      {showCharts && (
        <div className={`rounded-3xl p-5 shadow-lg relative overflow-hidden ${dominantMood ? moodBgClass : 'bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400'}`}>
          <div className="absolute inset-0 deco-dots" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">{greeting}</p>
                <p className="text-xl font-bold mt-1">💜 心情收支簿</p>
                <p className="text-white/70 text-xs mt-1">{moodMsg}</p>
                <p className="text-white/60 text-xs mt-0.5 italic">{moodTip}</p>
              </div>
              {dominantMood && (
                <div className="text-5xl bounce-in">{dominantMood.emoji}</div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { l: '📥 收入', v: formatAmount(stats.totalIncome), c: 'bg-white/15' },
                { l: '📤 支出', v: formatAmount(stats.totalExpense), c: 'bg-white/15' },
                { l: '💎 结余', v: formatAmount(stats.balance), c: 'bg-white/15' },
              ].map(card => <div key={card.l} className={`${card.c} rounded-2xl p-3 backdrop-blur-sm text-center`}><p className="text-white/70 text-xs">{card.l}</p><p className="text-base sm:text-lg font-bold mt-0.5">{card.v}</p></div>)}
            </div>
            {budgetStats > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex justify-between text-xs text-white/70"><span>本月预算 {formatAmount(budgetStats)}</span><span>{Math.round((stats.totalExpense / budgetStats) * 100)}%</span></div>
                <div className="w-full h-1.5 bg-white/20 rounded-full mt-1 overflow-hidden"><div className={`h-full rounded-full transition-all ${stats.totalExpense > budgetStats ? 'bg-red-400' : 'bg-white/60'}`} style={{ width: `${Math.min((stats.totalExpense / budgetStats) * 100, 100)}%` }} /></div>
              </div>
            )}
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="glass rounded-3xl p-8 shadow-sm border border-white/50 dark:border-gray-800/50">
          <EmptyState icon="💜" title="开始认识自己" description="记下第一笔账，同步记录心情" action={{ label: '✨ 记一笔', onClick: () => setShowAdd(true) }} />
        </div>
      ) : (
        <>
          {showCharts && (
            <>
              {/* Mood Wheel */}
              {moodStats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50 card-hover">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><span>🎭</span> 心情色彩</h3>
                    <div className="flex flex-wrap gap-2">
                      {moodStats.map((m, i) => (
                        <div key={m.value} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs ${m.count > 0 ? MOOD_BG[i % MOOD_BG.length] : ''} transition-all hover:scale-105 cursor-default`}>
                          <span className="text-base wiggle">{m.emoji}</span>
                          <span className="font-medium">{m.label}</span>
                          <span className="text-gray-400">{m.count}次</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50 card-hover">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><span>💸</span> 心情×消费额</h3>
                    <ResponsiveContainer width="100%" height={100}>
                      <BarChart data={moodStats.slice(0, 5)}><Bar dataKey="totalSpent" radius={[4, 4, 0, 0]}>{moodStats.map((_, i) => <Cell key={i} fill={MOOD_COLORS[i % MOOD_COLORS.length]} />)}</Bar></BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-gray-400">{moodStats.filter(m => m.totalSpent > 0).slice(0, 5).map(m => <span key={m.value}>{m.emoji} {formatAmount(m.totalSpent)}</span>)}</div>
                  </div>
                </div>
              )}

              {/* Category */}
              {expenseBreakdown.length > 0 && (
                <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50 card-hover">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><span>🏷️</span> 支出分类</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-24"><ResponsiveContainer><PieChart><Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={22} outerRadius={40} paddingAngle={3} dataKey="amount">{expenseBreakdown.map(e => <Cell key={e.categoryId} fill={e.categoryColor} />)}</Pie></PieChart></ResponsiveContainer></div>
                    <div className="flex-1 space-y-1">{expenseBreakdown.slice(0, 4).map(item => <div key={item.categoryId} className="flex items-center gap-1.5 text-xs"><span>{item.categoryIcon}</span><span className="flex-1 truncate">{item.categoryName}</span><span className="text-gray-400 font-medium">{item.percentage}%</span></div>)}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Calendar */}
          <button onClick={() => setShowCalendar(!showCalendar)} className="text-xs text-violet-500 hover:text-violet-600 w-full">{showCalendar ? '收起日历 ▲' : '展开日历 ▼'}</button>
          {showCalendar && <CalendarHeatmap transactions={calendarTransactions} yearMonth={calendarMonth} selectedDay={selectedDay} onSelectDay={setSelectedDay} onMonthChange={setCalendarMonth} />}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex rounded-full border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {(['all','expense','income'] as FilterType[]).map(t => <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 text-xs font-medium ${filterType === t ? 'bg-violet-500 text-white' : 'bg-white/40 text-gray-500'}`}>{t === 'all' ? '全部' : t === 'expense' ? '支出' : '收入'}</button>)}
            </div>
            <select value={filterMood} onChange={e => setFilterMood(e.target.value)} className="px-2 py-1 rounded-full border border-gray-200/50 dark:border-gray-700/50 bg-white/40 text-xs"><option value="">全部心情</option>{MOODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}</select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-2 py-1 rounded-full border border-gray-200/50 dark:border-gray-700/50 bg-white/40 text-xs"><option value="">全部分类</option>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2 py-1 rounded-full border border-gray-200/50 dark:border-gray-700/50 bg-white/40 text-xs" />
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2 py-1 rounded-full border border-gray-200/50 dark:border-gray-700/50 bg-white/40 text-xs" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="🔍 搜索" className="flex-1 min-w-[80px] px-3 py-1 rounded-full border border-gray-200/50 dark:border-gray-700/50 bg-white/40 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400" />
          </div>

          {/* Transaction List */}
          <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
            {grouped.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">没有找到匹配的记录</div> : grouped.map(([date, items]) => (
              <div key={date}>
                <div className="px-5 py-2.5 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/30 text-xs font-medium text-gray-500 flex justify-between"><span>{formatDate(date)}</span><span className="text-gray-400">收 ¥{items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(2)} 支 ¥{items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(2)}</span></div>
                {items.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/30 dark:hover:bg-gray-800/20 transition-colors cursor-pointer group border-b border-gray-50/50 dark:border-gray-800/20 last:border-0" onClick={() => handleEdit(t)}>
                    <CategoryIcon categoryId={t.categoryId} size="sm" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{categories.find(c => c.id === t.categoryId)?.name || '未分类'}</p>{t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}</div>
                    {t.mood && <span className="text-base wiggle">{t.mood}</span>}
                    <p className={`text-sm font-semibold ${t.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>{t.type === 'expense' ? '-' : '+'}{formatAmount(t.amount)}</p>
                    <button onClick={e => { e.stopPropagation(); setDeleteId(t.id) }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 fade-in" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3 flex items-center gap-1.5"><span>✏️</span> 编辑记录</h3>
            <div className="space-y-3">
              <div className="flex gap-2">{['expense','income'].map(t => <button key={t} onClick={() => setEditType(t as any)} className={`flex-1 py-2 rounded-2xl text-sm font-medium ${editType === t ? (t === 'expense' ? 'bg-red-400 text-white' : 'bg-green-400 text-white') : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{t === 'expense' ? '支出' : '收入'}</button>)}</div>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="金额" className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <div className="grid grid-cols-4 gap-2">{currentCats.map(c => <button key={c.id} onClick={() => setEditCatId(c.id)} className={`flex flex-col items-center gap-1 p-2 rounded-2xl text-xs ${editCatId === c.id ? 'bg-violet-50 dark:bg-violet-900/30 ring-2 ring-violet-400' : 'bg-gray-50 dark:bg-gray-800'}`}><span className="text-lg">{c.icon}</span><span>{c.name}</span></button>)}</div>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="描述" className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <div><p className="text-xs text-gray-400 mb-1.5">💭 心情</p><div className="flex flex-wrap gap-1">{MOODS.map(m => <button key={m.value} onClick={() => setEditMood(editMood === m.value ? '' : m.value)} className={`px-2 py-1 rounded-xl text-sm transition-all ${editMood === m.value ? 'bg-violet-50 dark:bg-violet-900/30 ring-1 ring-violet-400 scale-105' : 'bg-gray-50 dark:bg-gray-800'}`}>{m.emoji} {m.label}</button>)}</div></div>
              {projects.length > 0 && <select value={editProjectId} onChange={e => setEditProjectId(e.target.value)} className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"><option value="">📁 分账单（可选）</option>{projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}</select>}
              <div className="flex gap-2 pt-1"><button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">取消</button><button onClick={handleSaveEdit} className="flex-1 py-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium">💾 保存</button></div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 fade-in" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-center font-medium">🗑️ 确认删除</p><p className="text-center text-sm text-gray-400 mt-1 mb-4">删除后无法恢复哦</p>
            <div className="flex gap-2"><button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">取消</button><button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 rounded-2xl bg-red-400 text-white text-sm font-medium">删除</button></div>
          </div>
        </div>
      )}

      <button onClick={() => setShowAdd(true)} className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full shadow-lg halo-pulse flex items-center justify-center text-2xl z-40 hover:scale-110 active:scale-95 transition-transform">+</button>
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}
