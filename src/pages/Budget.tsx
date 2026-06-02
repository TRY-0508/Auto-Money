import { useState, useMemo } from 'react'
import { useTransactions, useCategories, useBudgets } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'

export default function Budget() {
  const yearMonth = getCurrentYearMonth()
  const [year, month] = yearMonth.split('-')
  const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()
  const { budgets, addBudget, updateBudget, deleteBudget } = useBudgets()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')

  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])

  const expenseCats = categories.filter(c => c.type === 'expense')

  // Total budget = sum of all category budgets
  const categoryBudgets = useMemo(() => {
    const result: { cat: typeof expenseCats[0]; budget: typeof budgets[0] | undefined; spent: number; percentage: number }[] = []
    let totalBudgeted = 0
    for (const cat of expenseCats) {
      const budget = budgets.find(b => b.categoryId === cat.id && b.yearMonth === yearMonth)
      const spent = breakdown.find(b => b.categoryId === cat.id)?.amount || 0
      if (budget) totalBudgeted += budget.amount
      const pct = budget && budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0
      result.push({ cat, budget, spent, percentage: pct })
    }
    return { items: result, totalBudgeted }
  }, [budgets, expenseCats, breakdown, yearMonth])

  const handleSave = async (catId: string) => {
    const a = parseFloat(editAmount); if (!a || a <= 0) return
    const exist = budgets.find(b => b.categoryId === catId && b.yearMonth === yearMonth)
    if (exist) await updateBudget(exist.id, { amount: a })
    else await addBudget({ categoryId: catId, amount: a, period: 'monthly', yearMonth })
    setEditingId(null); setEditAmount('')
  }

  const handleDeleteBudget = async (catId: string) => {
    const b = budgets.find(x => x.categoryId === catId && x.yearMonth === yearMonth)
    if (b) await deleteBudget(b.id)
  }

  const getProgressColor = (spent: number, budget: number) => {
    const r = spent / budget
    if (r > 1) return 'from-red-400 to-red-500'
    if (r > 0.8) return 'from-amber-400 to-orange-400'
    return 'from-emerald-400 to-green-500'
  }

  const budgetedCats = categoryBudgets.items.filter(i => i.budget)
  const unbudgetedCats = categoryBudgets.items.filter(i => !i.budget)

  return (
    <div className="max-w-lg mx-auto space-y-4 slide-up">
      {/* Overall Summary */}
      <div className="glass rounded-3xl p-5 shadow-sm border border-white/50 dark:border-gray-800/50">
        <p className="text-xs text-gray-400 mb-1">{year}年{month}月</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">📊 总预算</p>
            <p className="text-xl font-bold text-blue-500 mt-1">
              {categoryBudgets.totalBudgeted > 0 ? formatAmount(categoryBudgets.totalBudgeted) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{budgetedCats.length} 个分类已设预算</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">📤 已支出</p>
            <p className="text-xl font-bold text-red-400 mt-1">{formatAmount(stats.totalExpense)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {categoryBudgets.totalBudgeted > 0
                ? `占比 ${Math.round((stats.totalExpense / categoryBudgets.totalBudgeted) * 100)}%`
                : '—'}
            </p>
          </div>
        </div>

        {categoryBudgets.totalBudgeted > 0 && (
          <div className="mt-3">
            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(stats.totalExpense, categoryBudgets.totalBudgeted)} transition-all`}
                style={{ width: `${Math.min((stats.totalExpense / categoryBudgets.totalBudgeted) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {stats.totalExpense > categoryBudgets.totalBudgeted
                ? `⚠️ 超出总预算 ${formatAmount(stats.totalExpense - categoryBudgets.totalBudgeted)}`
                : `剩余 ${formatAmount(categoryBudgets.totalBudgeted - stats.totalExpense)}`
              }
            </p>
          </div>
        )}
      </div>

      {/* Budgeted Categories */}
      {budgetedCats.length > 0 && (
        <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
          <h3 className="text-sm font-semibold px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
            <span>📋</span> 已设预算
          </h3>
          {budgetedCats.map(({ cat, budget, spent, percentage }) => (
            <div key={cat.id} className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/30 last:border-0">
              {editingId === cat.id ? (
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span><span className="text-sm flex-1">{cat.name}</span>
                  <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    placeholder="金额" autoFocus onKeyDown={e => e.key === 'Enter' && handleSave(cat.id)}
                    className="w-24 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                  <button onClick={() => handleSave(cat.id)} className="text-xs text-blue-500 font-medium">保存</button>
                  <button onClick={() => { setEditingId(null); setEditAmount('') }} className="text-xs text-gray-400">取消</button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      已花 {formatAmount(spent)} / {formatAmount(budget!.amount)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(spent, budget!.amount)} transition-all`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${percentage >= 100 ? 'text-red-400' : percentage >= 80 ? 'text-amber-400' : 'text-gray-400'}`}>
                      {percentage}%
                    </span>
                    <button onClick={() => { setEditingId(cat.id); setEditAmount(String(budget!.amount)) }}
                      className="text-xs text-blue-500 hover:text-blue-600">修改</button>
                    <button onClick={() => handleDeleteBudget(cat.id)}
                      className="text-xs text-red-400 hover:text-red-600">删除</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Unbudgeted Categories */}
      {unbudgetedCats.length > 0 && (
        <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
          <h3 className="text-sm font-semibold px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
            <span>➕</span> 未设预算
          </h3>
          {unbudgetedCats.map(({ cat, spent }) => (
            <div key={cat.id} className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/30 last:border-0">
              {editingId === cat.id ? (
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span><span className="text-sm flex-1">{cat.name}</span>
                  <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    placeholder="预算金额" autoFocus onKeyDown={e => e.key === 'Enter' && handleSave(cat.id)}
                    className="w-24 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                  <button onClick={() => handleSave(cat.id)} className="text-xs text-blue-500 font-medium">保存</button>
                  <button onClick={() => { setEditingId(null); setEditAmount('') }} className="text-xs text-gray-400">取消</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-sm">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">已花 {formatAmount(spent)}</span>
                    <button onClick={() => { setEditingId(cat.id); setEditAmount('') }}
                      className="text-xs text-blue-500 hover:text-blue-600 font-medium">设置</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {expenseCats.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">暂无支出分类，先去设置页创建吧~</div>
      )}

      <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-4">
        💡 总预算 = 各分类预算之和 · 按月独立计算
      </p>
    </div>
  )
}
