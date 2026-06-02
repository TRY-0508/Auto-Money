import { useState, useMemo } from 'react'
import { useTransactions, useCategories, useBudgets } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'
import { generateReport } from '@/services/llm'

export default function Budget() {
  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()
  const { budgets, addBudget, updateBudget, deleteBudget } = useBudgets()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(
    () => getCategoryBreakdown(transactions, categories, 'expense', yearMonth),
    [transactions, categories, yearMonth]
  )

  const expenseCats = categories.filter((c) => c.type === 'expense')

  const totalBudget = budgets
    .filter((b) => b.categoryId === null)
    .reduce((s, b) => s + b.amount, 0)

  const handleSaveBudget = async (categoryId: string | null) => {
    const amount = parseFloat(editAmount)
    if (!amount || amount <= 0) return

    const existing = budgets.find((b) => b.categoryId === categoryId)
    if (existing) {
      await updateBudget(existing.id, { amount })
    } else {
      await addBudget({
        categoryId,
        amount,
        period: 'monthly',
        yearMonth,
      })
    }
    setEditingId(null)
    setEditAmount('')
  }

  const handleAiSuggestion = async () => {
    setAiLoading(true)
    setAiSuggestion('')
    try {
      const summary = `最近三个月支出分类:\n${breakdown.map((b) => `${b.categoryName}: ${formatAmount(b.amount)}`).join('\n')}`
      const result = await generateReport(
        summary,
        '',
        'monthly',
        '预算建议'
      )
      setAiSuggestion(result)
    } catch {
      setAiSuggestion('AI 建议生成失败，请检查 API Key')
    } finally {
      setAiLoading(false)
    }
  }

  const getSpentForCategory = (categoryId: string | null): number => {
    if (categoryId === null) return stats.totalExpense
    const item = breakdown.find((b) => b.categoryId === categoryId)
    return item?.amount || 0
  }

  const getProgressColor = (spent: number, budget: number): string => {
    const ratio = spent / budget
    if (ratio > 1) return 'bg-red-500'
    if (ratio > 0.8) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Total Budget */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-medium mb-3">月度总预算</h3>
        {totalBudget > 0 ? (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>{formatAmount(stats.totalExpense)}</span>
              <span className="text-gray-400">预算 {formatAmount(totalBudget)}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(stats.totalExpense, totalBudget)}`}
                style={{ width: `${Math.min((stats.totalExpense / totalBudget) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {stats.totalExpense > totalBudget
                ? `已超预算 ${formatAmount(stats.totalExpense - totalBudget)}`
                : `剩余 ${formatAmount(totalBudget - stats.totalExpense)}`
              }
            </p>
          </div>
        ) : editingId === 'total' ? (
          <div className="flex gap-2">
            <input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              placeholder="设置月度预算"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget(null)}
            />
            <button onClick={() => handleSaveBudget(null)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">
              保存
            </button>
            <button onClick={() => { setEditingId(null); setEditAmount('') }} className="px-3 py-2 text-sm text-gray-400">
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingId('total'); setEditAmount('') }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            设置总预算
          </button>
        )}
      </div>

      {/* Category Budgets */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium">分类预算</h3>
        </div>
        {expenseCats.map((cat) => {
          const budget = budgets.find((b) => b.categoryId === cat.id)
          const spent = getSpentForCategory(cat.id)
          const isEditing = editingId === cat.id

          return (
            <div key={cat.id} className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="text-sm flex-1">{cat.name}</span>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="金额"
                    className="w-24 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget(cat.id)}
                  />
                  <button onClick={() => handleSaveBudget(cat.id)} className="text-sm text-blue-600">保存</button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-gray-400">取消</button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      已花 {formatAmount(spent)}
                      {budget ? ` / 预算 ${formatAmount(budget.amount)}` : ''}
                    </span>
                  </div>
                  {budget ? (
                    <div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(spent, budget.amount)}`}
                          style={{ width: `${Math.min((spent / budget.amount) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                  <button
                    onClick={() => { setEditingId(cat.id); setEditAmount(budget ? String(budget.amount) : '') }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    {budget ? '修改预算' : '设置预算'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* AI Suggestion */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">AI 预算建议</h3>
          <button
            onClick={handleAiSuggestion}
            disabled={aiLoading}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {aiLoading ? '分析中...' : '获取建议'}
          </button>
        </div>
        {aiSuggestion && (
          <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
            {aiSuggestion}
          </div>
        )}
      </div>
    </div>
  )
}
