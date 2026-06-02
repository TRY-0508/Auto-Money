import { useState, useMemo } from 'react'
import { useTransactions, useCategories, useBudgets } from '@/db/hooks'
import { generateReport } from '@/services/llm'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { formatAmount, getCurrentYearMonth } from '@/lib/utils'

type PeriodType = 'weekly' | 'monthly'

export default function Reports() {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')

  const yearMonth = getCurrentYearMonth()
  const { transactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()
  const { budgets } = useBudgets()

  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(
    () => getCategoryBreakdown(transactions, categories, 'expense', yearMonth),
    [transactions, categories, yearMonth]
  )

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setReport('')

    const [year, month] = yearMonth.split('-')
    const periodLabel = `${year}年${month}月`

    const transactionsSummary = `
总交易数: ${stats.count}
总收入: ${formatAmount(stats.totalIncome)}
总支出: ${formatAmount(stats.totalExpense)}
结余: ${formatAmount(stats.balance)}

支出分类明细:
${breakdown.map((b) => `- ${b.categoryName}: ${formatAmount(b.amount)} (${b.percentage}%)`).join('\n')}
`

    const budgetSummary = budgets.length > 0
      ? `预算情况:\n${budgets.map((b) => {
          const cat = categories.find((c) => c.id === b.categoryId)
          return `- ${cat?.name || '总预算'}: 预算 ${formatAmount(b.amount)}`
        }).join('\n')}`
      : '暂无预算设置'

    try {
      const result = await generateReport(transactionsSummary, budgetSummary, periodType, periodLabel)
      setReport(result)
    } catch (err: any) {
      setError(err.message || '报告生成失败')
    } finally {
      setLoading(false)
    }
  }

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    const html = lines.map((line) => {
      if (line.startsWith('### ')) {
        return `<h3 class="text-base font-semibold mt-4 mb-2">${line.replace('### ', '')}</h3>`
      }
      if (line.startsWith('## ')) {
        return `<h2 class="text-lg font-semibold mt-5 mb-2">${line.replace('## ', '')}</h2>`
      }
      if (line.startsWith('# ')) {
        return `<h1 class="text-xl font-bold mt-5 mb-3">${line.replace('# ', '')}</h1>`
      }
      if (line.startsWith('- ')) {
        return `<li class="ml-4 text-sm">${line.replace('- ', '')}</li>`
      }
      if (line.match(/^\d+\./)) {
        return `<li class="ml-4 text-sm">${line.replace(/^\d+\.\s*/, '')}</li>`
      }
      if (line.trim() === '') return '<br/>'
      return `<p class="text-sm">${line}</p>`
    }).join('\n')
    return html
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold mb-4">AI 财务报告</h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setPeriodType('monthly')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              periodType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            }`}
          >
            月报
          </button>
          <button
            onClick={() => setPeriodType('weekly')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              periodType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            }`}
          >
            周报
          </button>
        </div>

        {/* Data Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div>
            <p className="text-xs text-gray-400">本月支出</p>
            <p className="text-sm font-bold text-red-500">{formatAmount(stats.totalExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">本月收入</p>
            <p className="text-sm font-bold text-green-500">{formatAmount(stats.totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">交易笔数</p>
            <p className="text-sm font-semibold">{stats.count}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">结余</p>
            <p className={`text-sm font-bold ${stats.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatAmount(stats.balance)}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || stats.count === 0}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> AI 正在写报告...
            </span>
          ) : stats.count === 0 ? (
            '暂无数据，请先记账'
          ) : (
            '生成 AI 报告'
          )}
        </button>
      </div>

      {/* Report Content */}
      {report && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">报告内容</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(report)
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              复制文本
            </button>
          </div>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
          />
        </div>
      )}
    </div>
  )
}
