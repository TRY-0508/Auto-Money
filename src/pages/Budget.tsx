import { useState, useMemo } from 'react'
import { useTransactions, useCategories, useBudgets } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'

export default function Budget() {
  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()
  const { budgets, addBudget, updateBudget, deleteBudget } = useBudgets()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')

  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])
  const expenseCats = categories.filter(c => c.type === 'expense')
  const totalBudget = budgets.filter(b => b.categoryId === null).reduce((s, b) => s + b.amount, 0)

  const handleSave = async (catId: string | null) => {
    const a = parseFloat(editAmount); if (!a || a <= 0) return
    const exist = budgets.find(b => b.categoryId === catId)
    if (exist) await updateBudget(exist.id, { amount: a, yearMonth })
    else await addBudget({ categoryId: catId, amount: a, period: 'monthly', yearMonth })
    setEditingId(null); setEditAmount('')
  }

  const getSpent = (catId: string | null) => catId === null ? stats.totalExpense : (breakdown.find(b => b.categoryId === catId)?.amount || 0)
  const getColor = (spent: number, budget: number) => {
    const r = spent / budget
    if (r > 1) return 'from-red-400 to-red-500'
    if (r > 0.8) return 'from-yellow-400 to-orange-400'
    return 'from-green-400 to-emerald-400'
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 slide-up">
      {/* Total Budget */}
      <div className="glass rounded-3xl p-5 shadow-sm border border-white/50 dark:border-gray-800/50">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><span>🎯</span> 月度总预算</h3>
        {totalBudget > 0 ? (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-bold">{formatAmount(stats.totalExpense)}</span>
              <span className="text-gray-400">预算 {formatAmount(totalBudget)}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${getColor(stats.totalExpense, totalBudget)} transition-all`}
                style={{ width: `${Math.min((stats.totalExpense / totalBudget) * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {stats.totalExpense > totalBudget ? `⚠️ 已超预算 ${formatAmount(stats.totalExpense - totalBudget)}` : `剩余 ${formatAmount(totalBudget - stats.totalExpense)}`}
            </p>
          </>
        ) : editingId === 'total' ? (
          <div className="flex gap-2">
            <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
              placeholder="设置月度预算" autoFocus onKeyDown={e => e.key === 'Enter' && handleSave(null)}
              className="flex-1 px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
            <button onClick={() => handleSave(null)} className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">保存</button>
            <button onClick={() => { setEditingId(null); setEditAmount('') }} className="text-sm text-gray-400">取消</button>
          </div>
        ) : (
          <button onClick={() => { setEditingId('total'); setEditAmount(totalBudget > 0 ? String(totalBudget) : '') }}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium">
            {totalBudget > 0 ? '✏️ 修改预算' : '➕ 设置总预算'}
          </button>
        )}
      </div>

      {/* Category Budgets */}
      <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
        <h3 className="text-sm font-semibold px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5"><span>🏷️</span> 分类预算</h3>
        {expenseCats.map(cat => {
          const budget = budgets.find(b => b.categoryId === cat.id)
          const spent = getSpent(cat.id)
          return (
            <div key={cat.id} className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/30 last:border-0">
              {editingId === cat.id ? (
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span><span className="text-sm flex-1">{cat.name}</span>
                  <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    placeholder="金额" autoFocus onKeyDown={e => e.key === 'Enter' && handleSave(cat.id)}
                    className="w-24 px-2 py-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                  <button onClick={() => handleSave(cat.id)} className="text-xs text-blue-500 font-medium">保存</button>
                  <button onClick={() => { setEditingId(null); setEditAmount('') }} className="text-xs text-gray-400">取消</button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span><span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">已花 {formatAmount(spent)}{budget ? ` / ${formatAmount(budget.amount)}` : ''}</span>
                  </div>
                  {budget && (
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${getColor(spent, budget.amount)} transition-all`}
                        style={{ width: `${Math.min((spent / budget.amount) * 100, 100)}%` }} />
                    </div>
                  )}
                  <button onClick={() => { setEditingId(cat.id); setEditAmount(budget ? String(budget.amount) : '') }}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium mt-1.5">
                    {budget ? '✏️ 修改' : '➕ 设置预算'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-4">💡 设置预算帮你更好地管理支出</p>
    </div>
  )
}
