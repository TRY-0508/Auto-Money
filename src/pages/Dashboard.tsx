import { useState, useMemo, useCallback } from 'react'
import { useTransactions, useCategories } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown, getDailyTrend, getPreviousMonthComparison } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount, formatDate } from '@/lib/utils'
import CategoryIcon from '@/components/CategoryIcon'
import EmptyState from '@/components/EmptyState'
import AddModal from '@/components/AddModal'
import type { Transaction } from '@/types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

type FilterType = 'all' | 'expense' | 'income'

export default function Dashboard() {
  const [showAdd, setShowAdd] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth())
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editType, setEditType] = useState<'expense' | 'income'>('expense')
  const [showChart, setShowChart] = useState(true)

  const yearMonth = selectedMonth
  const { transactions, updateTransaction, deleteTransaction } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()

  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])
  const dailyTrend = useMemo(() => getDailyTrend(transactions, 14), [transactions])

  const filtered = useMemo(() => {
    let data = transactions
    if (filterType !== 'all') data = data.filter(t => t.type === filterType)
    if (filterCategory) data = data.filter(t => t.categoryId === filterCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data.filter(t => t.description.toLowerCase().includes(q) || (categories.find(c => c.id === t.categoryId)?.name || '').toLowerCase().includes(q))
    }
    return data
  }, [transactions, filterType, filterCategory, searchQuery, categories])

  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    for (const t of filtered) groups[t.date] = [...(groups[t.date] || []), t]
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      opts.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${d.getFullYear()}年${d.getMonth() + 1}月` })
    }
    return opts
  }, [])

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t); setEditAmount(String(t.amount)); setEditDesc(t.description)
    setEditDate(t.date); setEditCategoryId(t.categoryId); setEditType(t.type)
  }

  const handleSaveEdit = async () => {
    if (!editingTransaction) return
    const amount = parseFloat(editAmount)
    if (!amount || amount <= 0) return
    await updateTransaction(editingTransaction.id, { amount, description: editDesc, date: editDate, categoryId: editCategoryId, type: editType })
    setEditingTransaction(null)
  }

  const handleDelete = async (id: string) => {
    await deleteTransaction(id)
    setDeleteConfirm(null)
  }

  const expenseCats = categories.filter(c => c.type === 'expense')
  const incomeCats = categories.filter(c => c.type === 'income')
  const currentCats = editType === 'expense' ? expenseCats : incomeCats

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {/* Month Selector */}
      <div className="flex items-center gap-2">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium focus:outline-none">
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={() => setShowChart(!showChart)}
          className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline">
          {showChart ? '收起图表' : '展开图表'}
        </button>
      </div>

      {/* Stats Cards */}
      {showChart && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '收入', value: formatAmount(stats.totalIncome), color: 'text-green-500' },
              { label: '支出', value: formatAmount(stats.totalExpense), color: 'text-red-500' },
              { label: '结余', value: formatAmount(stats.balance), color: stats.balance >= 0 ? 'text-blue-500' : 'text-red-500' },
            ].map(card => (
              <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-xs text-gray-400">{card.label}</p>
                <p className={`text-base sm:text-lg font-bold mt-0.5 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          {breakdown.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 mb-2">支出分类</p>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={breakdown} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="amount">
                          {breakdown.map(e => <Cell key={e.categoryId} fill={e.categoryColor} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1">
                    {breakdown.slice(0, 4).map(item => (
                      <div key={item.categoryId} className="flex items-center gap-1.5 text-xs">
                        <span>{item.categoryIcon}</span><span className="flex-1 truncate">{item.categoryName}</span>
                        <span className="text-gray-400">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {dailyTrend.some(d => d.expense > 0 || d.income > 0) && (
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-400 mb-2">近14天趋势</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={dailyTrend}>
                      <Bar dataKey="expense" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="income" fill="#22c55e" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {(['all', 'expense', 'income'] as FilterType[]).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-xs font-medium ${filterType === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500'}`}>
              {t === 'all' ? '全部' : t === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs">
          <option value="">全部分类</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索..." className="flex-1 min-w-[100px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {grouped.length === 0 ? (
          <EmptyState icon="📝" title="还没有记录" description="点击下方 + 按钮开始记账" />
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 flex justify-between">
                <span className="font-medium">{formatDate(date)}</span>
                <span className="text-gray-400">
                  收 ¥{items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(2)}
                  {' '}支 ¥{items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(2)}
                </span>
              </div>
              {items.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group" onClick={() => handleEdit(t)}>
                  <CategoryIcon categoryId={t.categoryId} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{categories.find(c => c.id === t.categoryId)?.name || '未分类'}</p>
                    {t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}
                  </div>
                  <p className={`text-sm font-semibold ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                    {t.type === 'expense' ? '-' : '+'}{formatAmount(t.amount)}
                  </p>
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm(t.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setEditingTransaction(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">编辑记录</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setEditType('expense')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${editType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>支出</button>
                <button onClick={() => setEditType('income')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${editType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>收入</button>
              </div>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="金额" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <div className="grid grid-cols-4 gap-2">
                {currentCats.map(c => (
                  <button key={c.id} onClick={() => setEditCategoryId(c.id)} className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs ${editCategoryId === c.id ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <span className="text-lg">{c.icon}</span><span>{c.name}</span>
                  </button>
                ))}
              </div>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="描述" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditingTransaction(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">取消</button>
                <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 w-full max-w-xs shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-center font-medium mb-1">确认删除</p>
            <p className="text-center text-sm text-gray-400 mb-4">删除后无法恢复</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">取消</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-2xl z-40 hover:scale-110 active:scale-95"
      >
        +
      </button>

      {/* Add Modal */}
      <AddModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}
