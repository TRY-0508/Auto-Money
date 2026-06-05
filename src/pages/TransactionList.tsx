import { useState, useMemo, useRef } from 'react'
import { useTransactions, useCategories } from '@/db/hooks'
import CategoryIcon from '@/components/CategoryIcon'
import EmptyState from '@/components/EmptyState'
import ProjectSwitcher from '@/components/ProjectSwitcher'
import { MOODS } from '@/lib/constants'
import { useProjects } from '@/db/hooks'
import { formatDate, formatAmount, getCurrentYearMonth } from '@/lib/utils'
import type { Transaction } from '@/types'

type FilterType = 'all' | 'expense' | 'income'

function CalendarHeatmap({
  transactions, yearMonth, selectedDay, onSelectDay, onMonthChange,
}: {
  transactions: Transaction[]
  yearMonth: string
  selectedDay: string | null
  onSelectDay: (date: string | null) => void
  onMonthChange: (ym: string) => void
}) {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const today = new Date().toISOString().slice(0, 10)

  const dailyTotals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type === 'expense') map[t.date] = (map[t.date] || 0) + t.amount
    }
    return map
  }, [transactions])

  const maxTotal = Math.max(...Object.values(dailyTotals), 1)

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) week.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const getIntensity = (day: number | null, dateStr: string): string => {
    if (day === null) return ''
    const total = dailyTotals[dateStr] || 0
    if (total === 0) return 'bg-gray-100 dark:bg-gray-800 text-gray-400'
    const ratio = total / maxTotal
    if (ratio > 0.66) return 'bg-red-400 dark:bg-red-600 text-white'
    if (ratio > 0.33) return 'bg-orange-300 dark:bg-orange-600 text-white'
    return 'bg-yellow-200 dark:bg-yellow-700 text-gray-700 dark:text-gray-200'
  }

  const prevMonth = () => {
    let y = year, m = month - 1
    if (m === 0) { m = 12; y-- }
    onMonthChange(`${y}-${String(m).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    let y = year, m = month + 1
    if (m === 13) { m = 1; y++ }
    onMonthChange(`${y}-${String(m).padStart(2, '0')}`)
  }

  // Swipe support
  const touchStartX = useRef(0)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      if (diff > 0) nextMonth()
      else prevMonth()
    }
  }

  return (
    <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">‹</button>
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <span>📅</span> {year}年{month}月
        </h3>
        <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {weeks.map((w, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {w.map((day, di) => {
            if (day === null) return <div key={di} />
            const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`
            const isSelected = selectedDay === dateStr
            const isToday = dateStr === today
            return (
              <button
                key={di}
                onClick={() => onSelectDay(isSelected ? null : dateStr)}
                className={`aspect-square rounded-md flex flex-col items-center justify-center text-[11px] font-medium transition-all relative
                  ${getIntensity(day, dateStr)}
                  ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900' : ''}
                  ${isToday && !isSelected ? 'ring-1 ring-blue-300' : ''}
                `}
                title={`${day}日: ¥${(dailyTotals[dateStr] || 0).toFixed(2)}`}
              >
                {day}
                {(dailyTotals[dateStr] || 0) > 0 && (
                  <div className="w-1 h-1 rounded-full bg-white/60 mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      ))}

      <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-gray-400">
        <span>少</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
        <div className="w-3 h-3 rounded-sm bg-yellow-200 dark:bg-yellow-700" />
        <div className="w-3 h-3 rounded-sm bg-orange-300 dark:bg-orange-600" />
        <div className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-600" />
        <span>多</span>
        {selectedDay && (
          <button onClick={() => onSelectDay(null)} className="ml-auto text-blue-500 hover:text-blue-600">清除选择</button>
        )}
      </div>
    </div>
  )
}

export default function TransactionList() {
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(getCurrentYearMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editCatId, setEditCatId] = useState('')
  const [editType, setEditType] = useState<'expense' | 'income'>('expense')
  const [editProjectId, setEditProjectId] = useState('')
  const [editMood, setEditMood] = useState('')

  const { transactions, updateTransaction, deleteTransaction } = useTransactions()
  const { categories } = useCategories()
  const { projects } = useProjects()

  // Apply all filters
  const filtered = useMemo(() => {
    let data = transactions
    if (filterType !== 'all') data = data.filter(t => t.type === filterType)
    if (filterCategory) data = data.filter(t => t.categoryId === filterCategory)
    if (dateFrom) data = data.filter(t => t.date >= dateFrom)
    if (dateTo) data = data.filter(t => t.date <= dateTo)
    if (selectedDay) data = data.filter(t => t.date === selectedDay)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter(t => t.description.toLowerCase().includes(q) || (categories.find(c => c.id === t.categoryId)?.name || '').toLowerCase().includes(q))
    }
    if (projectId) data = data.filter(t => t.projectId === projectId)
    return data
  }, [transactions, filterType, filterCategory, dateFrom, dateTo, selectedDay, searchQuery, categories])

  const grouped = useMemo(() => {
    const g: Record<string, Transaction[]> = {}
    for (const t of filtered) g[t.date] = [...(g[t.date] || []), t]
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const handleEdit = (t: Transaction) => {
    setEditing(t); setEditAmount(String(t.amount)); setEditDesc(t.description)
    setEditDate(t.date); setEditCatId(t.categoryId); setEditType(t.type); setEditProjectId(t.projectId || ''); setEditMood(t.mood || '')
  }
  const handleSaveEdit = async () => {
    if (!editing) return
    const a = parseFloat(editAmount); if (!a || a <= 0) return
    await updateTransaction(editing.id, { amount: a, description: editDesc, date: editDate, categoryId: editCatId, type: editType, projectId: editProjectId || undefined, mood: editMood || undefined })
    setEditing(null)
  }
  const handleDelete = async (id: string) => { await deleteTransaction(id); setDeleteId(null) }

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')
  const currentCats = editType === 'expense' ? expenseCats : incomeCats

  // Get calendar month's transactions for heatmap only
  const calendarTransactions = useMemo(
    () => transactions.filter(t => t.date.startsWith(calendarMonth)),
    [transactions, calendarMonth]
  )

  return (
    <div className="max-w-4xl mx-auto space-y-4 slide-up">
      {/* Project Switcher */}
      <ProjectSwitcher selectedId={projectId} onChange={setProjectId} />

      {/* Calendar */}
      <CalendarHeatmap
        transactions={calendarTransactions}
        yearMonth={calendarMonth}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onMonthChange={setCalendarMonth}
      />

      {/* Filters - independent from calendar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {(['all', 'expense', 'income'] as FilterType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${filterType === t ? 'bg-blue-500 text-white' : 'bg-white/80 dark:bg-gray-900/80 text-gray-500'}`}>
              {t === 'all' ? '全部' : t === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="px-2 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-xs backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <span className="text-xs text-gray-400">至</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="px-2 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-xs backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-2 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-xs backdrop-blur">
          <option value="">全部分类</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 搜索..." className="flex-1 min-w-[100px] px-3 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-xs backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-300" />
      </div>

      {/* Summary */}
      <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-400 mb-1">📥 收入</p>
            <p className="text-lg font-bold text-green-500">{formatAmount(totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">📤 支出</p>
            <p className="text-lg font-bold text-red-400">{formatAmount(totalExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">💎 结余</p>
            <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatAmount(totalIncome - totalExpense)}
            </p>
          </div>
        </div>
        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-2">{filtered.length} 笔记录</p>
        )}
      </div>

      {/* Transaction List */}
      <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
        {grouped.length === 0 ? (
          <EmptyState icon="📋" title="没有找到记录" description="试试调整筛选条件或滑动日历" />
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="px-5 py-2.5 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/50 dark:to-transparent text-xs font-medium text-gray-500 flex justify-between">
                <span>{formatDate(date)}</span>
                <span className="text-gray-400">
                  收 ¥{items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(2)}
                  {' '}支 ¥{items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(2)}
                </span>
              </div>
              {items.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer group border-b border-gray-50 dark:border-gray-800/20 last:border-0" onClick={() => handleEdit(t)}>
                  <CategoryIcon categoryId={t.categoryId} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{categories.find(c => c.id === t.categoryId)?.name || '未分类'}</p>
                    {t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}
                  </div>
                  <p className={`text-sm font-semibold ${t.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                    {t.type === 'expense' ? '-' : '+'}{formatAmount(t.amount)}
                  </p>
                  {t.mood && <span className="text-sm ml-1">{t.mood}</span>}
                  <button onClick={e => { e.stopPropagation(); setDeleteId(t.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 fade-in" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3 flex items-center gap-1.5"><span>✏️</span> 编辑记录</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setEditType('expense')} className={`flex-1 py-2 rounded-2xl text-sm font-medium ${editType === 'expense' ? 'bg-red-400 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>支出</button>
                <button onClick={() => setEditType('income')} className={`flex-1 py-2 rounded-2xl text-sm font-medium ${editType === 'income' ? 'bg-green-400 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>收入</button>
              </div>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="金额" className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <div className="grid grid-cols-4 gap-2">
                {currentCats.map(c => (
                  <button key={c.id} onClick={() => setEditCatId(c.id)} className={`flex flex-col items-center gap-1 p-2 rounded-2xl text-xs transition-all ${editCatId === c.id ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                    <span className="text-lg">{c.icon}</span><span>{c.name}</span>
                  </button>
                ))}
              </div>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="描述" className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              {projects.length > 0 && (
                <select value={editProjectId} onChange={e => setEditProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">📁 分账单（可选）</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1.5">💭 心情</p>
                <div className="flex flex-wrap gap-1">
                  {MOODS.map(m => (
                    <button key={m.value} onClick={() => setEditMood(editMood === m.value ? '' : m.value)}
                      className={`px-2 py-1 rounded-xl text-sm transition-all ${editMood === m.value ? 'bg-purple-50 dark:bg-purple-900/30 ring-1 ring-purple-400' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}>
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">取消</button>
                <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 fade-in" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-center font-medium mb-1">🗑️ 确认删除</p>
            <p className="text-center text-sm text-gray-400 mb-4">删除后无法恢复哦</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm">取消</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 rounded-2xl bg-red-400 text-white text-sm font-medium">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
