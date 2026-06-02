import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTransactions, useCategories } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown, getDailyTrend } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'
import CategoryIcon from '@/components/CategoryIcon'
import EmptyState from '@/components/EmptyState'
import ProjectSwitcher from '@/components/ProjectSwitcher'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const yearMonth = getCurrentYearMonth()
  const [projectId, setProjectId] = useState<string | null>(null)
  const { transactions: allTransactions } = useTransactions({ month: yearMonth })
  const { categories } = useCategories()

  const transactions = useMemo(
    () => projectId ? allTransactions.filter(t => t.projectId === projectId) : allTransactions,
    [allTransactions, projectId]
  )

  const [year, month] = yearMonth.split('-').map(Number)
  const stats = useMemo(() => getMonthlyStats(transactions, yearMonth), [transactions, yearMonth])
  const breakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])
  const dailyTrend = useMemo(() => getDailyTrend(transactions, 14), [transactions])
  const recent = useMemo(() => [...transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5), [transactions])

  return (
    <div className="max-w-4xl mx-auto space-y-4 slide-up">
      {/* Project Switcher */}
      <ProjectSwitcher selectedId={projectId} onChange={setProjectId} />
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-5 text-white shadow-lg">
        <p className="text-white/80 text-sm">{year}年{month}月</p>
        <p className="text-2xl font-bold mt-1">💰 收支概览</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/15 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-white/70 text-xs">收入</p>
            <p className="text-lg font-bold mt-0.5">{formatAmount(stats.totalIncome)}</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-white/70 text-xs">支出</p>
            <p className="text-lg font-bold mt-0.5">{formatAmount(stats.totalExpense)}</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3 backdrop-blur-sm">
            <p className="text-white/70 text-xs">结余</p>
            <p className="text-lg font-bold mt-0.5">{formatAmount(stats.balance)}</p>
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-3xl p-8 shadow-sm border border-white/50 dark:border-gray-800/50">
          <EmptyState icon="💰" title="开始记账吧" description="用 AI 智能解析，说句话就能记一笔"
            action={{ label: '记第一笔账', onClick: () => navigate('/add') }} />
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {breakdown.length > 0 && (
              <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50 card-hover">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <span>🎨</span> 支出分类
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 flex-shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={breakdown} cx="50%" cy="50%" innerRadius={24} outerRadius={40} paddingAngle={2} dataKey="amount">
                          {breakdown.map(e => <Cell key={e.categoryId} fill={e.categoryColor} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    {breakdown.slice(0, 4).map(item => (
                      <div key={item.categoryId} className="flex items-center gap-1.5 text-xs">
                        <span>{item.categoryIcon}</span>
                        <span className="flex-1 truncate">{item.categoryName}</span>
                        <span className="text-gray-400 font-medium">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dailyTrend.some(d => d.expense > 0 || d.income > 0) && (
              <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50 card-hover">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <span>📈</span> 近14天趋势
                </h3>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={dailyTrend}>
                    <Bar dataKey="expense" fill="#f87171" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="income" fill="#4ade80" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <span>📋</span> 最近交易
              </h3>
              <Link to="/transactions" className="text-xs text-blue-500 hover:text-blue-600 font-medium">查看全部 →</Link>
            </div>
            {recent.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-50 dark:border-gray-800/30 last:border-0">
                <CategoryIcon categoryId={t.categoryId} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{categories.find(c => c.id === t.categoryId)?.name || '未分类'}</p>
                  {t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}
                </div>
                <p className={`text-sm font-semibold ${t.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                  {t.type === 'expense' ? '-' : '+'}{formatAmount(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
