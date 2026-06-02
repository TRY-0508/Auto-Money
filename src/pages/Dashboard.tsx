import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTransactions, useCategories } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown, getDailyTrend, getPreviousMonthComparison } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'
import TransactionItem from '@/components/TransactionItem'
import EmptyState from '@/components/EmptyState'
import type { Transaction } from '@/types'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const yearMonth = getCurrentYearMonth()
  const { transactions, deleteTransaction } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()

  const [year, month] = yearMonth.split('-').map(Number)
  const monthLabel = `${year}年${month}月`

  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(
    () => getCategoryBreakdown(transactions, categories, 'expense', yearMonth),
    [transactions, categories, yearMonth]
  )
  const dailyTrend = useMemo(() => getDailyTrend(transactions, 30), [transactions])
  const comparison = useMemo(() => getPreviousMonthComparison(transactions, yearMonth), [transactions, yearMonth])

  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  }, [transactions])

  const handleDelete = (id: string) => {
    deleteTransaction(id)
  }

  const handleEdit = (t: Transaction) => {
    // Navigate to edit - just re-route to transactions page for now
  }

  if (transactions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <EmptyState
            icon="💰"
            title="开始记账之旅"
            description="用 AI 智能解析或手动输入，轻松管理每一笔收支"
            action={{ label: '记第一笔账', onClick: () => navigate('/add') }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-sm text-gray-400 font-medium">{monthLabel}</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400">收入</p>
          <p className="text-lg sm:text-xl font-bold text-green-500 mt-0.5 sm:mt-1">{formatAmount(stats.totalIncome)}</p>
          {comparison.incomeChange !== 0 && (
            <p className={`text-xs mt-1 ${comparison.incomeChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {comparison.incomeChange > 0 ? '↑' : '↓'} {Math.abs(comparison.incomeChange)}%
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400">支出</p>
          <p className="text-lg sm:text-xl font-bold text-red-500 mt-0.5 sm:mt-1">{formatAmount(stats.totalExpense)}</p>
          {comparison.expenseChange !== 0 && (
            <p className={`text-xs mt-1 ${comparison.expenseChange < 0 ? 'text-green-500' : 'text-red-500'}`}>
              {comparison.expenseChange > 0 ? '↑' : '↓'} {Math.abs(comparison.expenseChange)}%
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400">结余</p>
          <p className={`text-lg sm:text-xl font-bold mt-0.5 sm:mt-1 ${stats.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
            {formatAmount(stats.balance)}
          </p>
        </div>
      </div>

      {/* Expense Category Pie Chart */}
      {breakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium mb-3">支出分类</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-40 h-40 sm:w-36 sm:h-36 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="amount"
                  >
                    {breakdown.map((entry) => (
                      <Cell key={entry.categoryId} fill={entry.categoryColor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full space-y-1.5">
              {breakdown.slice(0, 5).map((item) => (
                <div key={item.categoryId} className="flex items-center gap-2 text-xs">
                  <span>{item.categoryIcon}</span>
                  <span className="flex-1">{item.categoryName}</span>
                  <span className="text-gray-400 w-8 text-right">{item.percentage}%</span>
                  <span className="font-medium w-20 text-right">{formatAmount(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Trend Chart */}
      {dailyTrend.some((d) => d.expense > 0 || d.income > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium mb-3">近30天趋势</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(value: number) => formatAmount(value)} />
              <Bar dataKey="expense" fill="#ef4444" name="支出" radius={[2, 2, 0, 0]} />
              <Bar dataKey="income" fill="#22c55e" name="收入" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium">最近交易</h3>
          <Link to="/transactions" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            查看全部
          </Link>
        </div>
        {recentTransactions.map((t) => (
          <TransactionItem
            key={t.id}
            transaction={t}
            onEdit={() => {}}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
