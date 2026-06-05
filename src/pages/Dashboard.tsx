import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTransactions, useCategories } from '@/db/hooks'
import { getMonthlyStats, getCategoryBreakdown } from '@/lib/stats'
import { getCurrentYearMonth, formatAmount } from '@/lib/utils'
import { MOODS } from '@/lib/constants'
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
  const expenseBreakdown = useMemo(() => getCategoryBreakdown(transactions, categories, 'expense', yearMonth), [transactions, categories, yearMonth])

  // Mood statistics
  const moodStats = useMemo(() => {
    const map: Record<string, { count: number; totalSpent: number }> = {}
    for (const t of transactions) {
      if (!t.mood || t.type !== 'expense') continue
      if (!map[t.mood]) map[t.mood] = { count: 0, totalSpent: 0 }
      map[t.mood].count++
      map[t.mood].totalSpent += t.amount
    }
    return MOODS.filter(m => map[m.value]).map(m => ({
      ...m,
      count: map[m.value]?.count || 0,
      totalSpent: map[m.value]?.totalSpent || 0,
    })).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [transactions])

  const recent = useMemo(() => [...transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5), [transactions])

  // Mood colors for pie
  const moodColors = ['#a855f7', '#6366f1', '#94a3b8', '#38bdf8', '#f97316', '#ef4444', '#ec4899', '#14b8a6']

  return (
    <div className="max-w-4xl mx-auto space-y-4 slide-up">
      <ProjectSwitcher selectedId={projectId} onChange={setProjectId} />

      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-5 text-white shadow-lg">
        <p className="text-white/80 text-sm">{year}年{month}月</p>
        <p className="text-2xl font-bold mt-1">💜 心情收支簿</p>
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
        <div className="glass rounded-3xl p-8 shadow-sm border border-white/50 dark:border-gray-800/50">
          <EmptyState icon="💜" title="开始记录吧" description="记一笔账，同时记录此刻的心情"
            action={{ label: '记第一笔账', onClick: () => navigate('/add') }} />
        </div>
      ) : (
        <>
          {/* Mood Charts */}
          {moodStats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50 card-hover">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><span>💭</span> 心情分布</h3>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 flex-shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={moodStats} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="count" nameKey="label">
                          {moodStats.map((_, i) => <Cell key={i} fill={moodColors[i % moodColors.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    {moodStats.slice(0, 4).map((m, i) => (
                      <div key={m.value} className="flex items-center gap-1.5 text-xs">
                        <span>{m.emoji}</span><span className="flex-1 truncate">{m.label}</span>
                        <span className="text-gray-400">{m.count}次</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50 card-hover">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><span>📊</span> 心情×消费金额</h3>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={moodStats.slice(0, 5)}>
                    <Bar dataKey="totalSpent" radius={[3, 3, 0, 0]}>
                      {moodStats.map((_, i) => <Cell key={i} fill={moodColors[i % moodColors.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-400">
                  {moodStats.filter(m => m.totalSpent > 0).slice(0, 5).map(m => (
                    <span key={m.value}>{m.emoji} {formatAmount(m.totalSpent)}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Expense Category Pie */}
          {expenseBreakdown.length > 0 && (
            <div className="glass rounded-3xl p-4 shadow-sm border border-white/50 dark:border-gray-800/50 card-hover">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><span>🎨</span> 支出分类</h3>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 flex-shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={22} outerRadius={40} paddingAngle={2} dataKey="amount">
                        {expenseBreakdown.map(e => <Cell key={e.categoryId} fill={e.categoryColor} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  {expenseBreakdown.slice(0, 4).map(item => (
                    <div key={item.categoryId} className="flex items-center gap-1.5 text-xs">
                      <span>{item.categoryIcon}</span><span className="flex-1 truncate">{item.categoryName}</span>
                      <span className="text-gray-400 font-medium">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="glass rounded-3xl shadow-sm border border-white/50 dark:border-gray-800/50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold flex items-center gap-1.5"><span>📋</span> 最近记录</h3>
              <Link to="/transactions" className="text-xs text-purple-500 hover:text-purple-600 font-medium">查看全部 →</Link>
            </div>
            {recent.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-50 dark:border-gray-800/30 last:border-0">
                <CategoryIcon categoryId={t.categoryId} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{categories.find(c => c.id === t.categoryId)?.name || '未分类'}</p>
                  {t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}
                </div>
                {t.mood && <span className="text-sm">{t.mood}</span>}
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
