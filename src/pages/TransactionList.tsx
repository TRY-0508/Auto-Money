import { useState, useMemo } from 'react'
import { useTransactions, useCategories } from '@/db/hooks'
import TransactionItem from '@/components/TransactionItem'
import EmptyState from '@/components/EmptyState'
import { formatDate, getCurrentYearMonth } from '@/lib/utils'
import type { Transaction } from '@/types'

type FilterType = 'all' | 'expense' | 'income'

export default function TransactionList() {
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

  const { transactions, updateTransaction, deleteTransaction } = useTransactions({
    type: filterType,
    categoryId: filterCategory || undefined,
    month: selectedMonth,
  })
  const { categories } = useCategories()

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return transactions
    const q = searchQuery.toLowerCase()
    return transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        (categories.find((c) => c.id === t.categoryId)?.name || '').toLowerCase().includes(q)
    )
  }, [transactions, searchQuery, categories])

  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    for (const t of filtered) {
      if (!groups[t.date]) groups[t.date] = []
      groups[t.date].push(t)
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t)
    setEditAmount(String(t.amount))
    setEditDesc(t.description)
    setEditDate(t.date)
    setEditCategoryId(t.categoryId)
    setEditType(t.type)
  }

  const handleSaveEdit = async () => {
    if (!editingTransaction) return
    const amount = parseFloat(editAmount)
    if (!amount || amount <= 0) return
    await updateTransaction(editingTransaction.id, {
      amount,
      description: editDesc,
      date: editDate,
      categoryId: editCategoryId,
      type: editType,
    })
    setEditingTransaction(null)
  }

  const handleDelete = async (id: string) => {
    await deleteTransaction(id)
    setDeleteConfirm(null)
  }

  const expenseCats = categories.filter((c) => c.type === 'expense')
  const incomeCats = categories.filter((c) => c.type === 'income')
  const currentCats = editType === 'expense' ? expenseCats : incomeCats

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      options.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      })
    }
    return options
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
          >
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['all', 'expense', 'income'] as FilterType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterType === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {t === 'all' ? '全部' : t === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
          >
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div className="px-3 py-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索描述或分类..."
            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {grouped.length === 0 ? (
          <EmptyState
            icon="📋"
            title="没有找到交易记录"
            description={searchQuery ? '试试修改搜索条件' : '点击右上角"记账"开始记录'}
          />
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500">
                {formatDate(date)}
                <span className="ml-2 text-gray-400">
                  支出 ¥{items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(2)}
                  {' '}收入 ¥{items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(2)}
                </span>
              </div>
              {items.map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirm(id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setEditingTransaction(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">编辑记录</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setEditType('expense')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${
                    editType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >支出</button>
                <button
                  onClick={() => setEditType('income')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${
                    editType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >收入</button>
              </div>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="金额"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {currentCats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setEditCategoryId(c.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs ${
                      editCategoryId === c.id ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="描述"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingTransaction(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                  取消
                </button>
                <button onClick={handleSaveEdit} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-xs shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-center font-medium mb-2">确认删除</p>
            <p className="text-center text-sm text-gray-400 mb-4">删除后无法恢复</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                取消
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
