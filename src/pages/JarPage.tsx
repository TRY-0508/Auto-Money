import { useState, useEffect } from 'react'
import { useJarGoals, useCoolDownEvents } from '@/db/hooks'
import type { CoolDownEvent, CoolDownAIAnalysis } from '@/types'
import StarJar from '@/components/StarJar'
import { analyzeCalmEvent } from '@/services/llm'
import { formatAmount } from '@/lib/utils'
import {
  Target, Plus, X, Trash2,
  Timer, Clock, ShieldCheck, ShieldX, Flame,
  Hourglass, BarChart3, AlertTriangle, Zap,
} from '@/lib/icons'

const COOLDOWN_PRESETS = [1, 6, 24, 48, 72, 168] as const

const GOAL_COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#f43f5e', '#3b82f6', '#ec4899', '#14b8a6']

function cooldownLabel(h: number): string {
  const map: Record<number, string> = { 1: '1 小时', 6: '6 小时', 24: '1 天', 48: '2 天', 72: '3 天', 168: '7 天' }
  return map[h] || `${h} 小时`
}

function getRemaining(endsAt: number): { text: string; expired: boolean } {
  const ms = endsAt - Date.now()
  if (ms <= 0) return { text: '已到期', expired: true }
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return { text: `${h}时${m}分`, expired: false }
  if (m > 0) return { text: `${m}分${s}秒`, expired: false }
  return { text: `${s}秒`, expired: false }
}

function formatDateStr(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Tab = 'goals' | 'events' | 'history'

export default function JarPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useJarGoals()
  const { events, addEvent, updateEvent, deleteEvent } = useCoolDownEvents()

  const [tab, setTab] = useState<Tab>('goals')
  const [tick, setTick] = useState(0)

  // New goal
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDesc, setGoalDesc] = useState('')

  // New event form
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [evtDesc, setEvtDesc] = useState('')
  const [evtAmount, setEvtAmount] = useState('')
  const [evtAILoading, setEvtAILoading] = useState(false)
  const [evtAIResult, setEvtAIResult] = useState<CoolDownAIAnalysis | null>(null)
  const [evtAIError, setEvtAIError] = useState('')
  const [evtGoalId, setEvtGoalId] = useState('')

  // Re-evaluation
  const [reviewEvent, setReviewEvent] = useState<CoolDownEvent | null>(null)
  const [reviewDesire, setReviewDesire] = useState(3)
  const [reviewNote, setReviewNote] = useState('')
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false)

  // Timer
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const now = Date.now()
    for (const e of events) {
      if (e.status === 'cooling' && e.cooldownEndsAt <= now) {
        updateEvent(e.id, { status: 'pending_review' })
      }
    }
  }, [tick])

  // ── Computed ──
  const coolingEvents = events.filter(e => e.status === 'cooling').sort((a, b) => a.cooldownEndsAt - b.cooldownEndsAt)
  const pendingReviewEvents = events.filter(e => e.status === 'pending_review').sort((a, b) => b.createdAt - a.createdAt)
  const resistedCount = events.filter(e => e.status === 'resisted').length
  const failedCount = events.filter(e => e.status === 'failed' || e.status === 'purchased').length
  const totalResistedAmount = events.filter(e => e.status === 'resisted').reduce((s, e) => s + e.amount, 0)
  const successRate = resistedCount + failedCount > 0 ? Math.round((resistedCount / (resistedCount + failedCount)) * 100) : 0
  const totalStars = goals.reduce((s, g) => s + g.starCount, 0)

  // ── Goal handlers ──
  const handleAddGoal = async () => {
    if (!goalName.trim()) return
    await addGoal({
      name: goalName.trim(),
      targetAmount: parseFloat(goalTarget) || 1000,
      currentAmount: 0,
      starCount: 0,
      description: goalDesc.trim(),
      color: GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)],
    })
    setShowNewGoal(false)
    setGoalName(''); setGoalTarget(''); setGoalDesc('')
  }

  const handleDeleteGoal = async (id: string) => {
    const goalEvents = events.filter(e => e.goalId === id && (e.status === 'cooling' || e.status === 'pending_review'))
    if (goalEvents.length > 0) {
      if (!window.confirm(`该目标下还有 ${goalEvents.length} 个未完成的冷静事件，确定删除吗？`)) return
    }
    await deleteGoal(id)
  }

  // ── AI analysis ──
  const handleAIAnalyze = async () => {
    if (!evtDesc.trim()) return
    setEvtAILoading(true); setEvtAIError(''); setEvtAIResult(null)
    try {
      const result = await analyzeCalmEvent(evtDesc.trim(), parseFloat(evtAmount) || 0)
      setEvtAIResult(result)
    } catch (err: any) {
      setEvtAIError(err.message || '分析失败，请检查 API 配置')
    } finally { setEvtAILoading(false) }
  }

  const handleAddEvent = async () => {
    if (!evtDesc.trim()) return
    const analysis = evtAIResult
    const now = Date.now()
    const cooldown = analysis?.suggestedCooldown ?? 24
    await addEvent({
      goalId: evtGoalId || undefined,
      description: evtDesc.trim(),
      amount: parseFloat(evtAmount) || 0,
      desireLevel: analysis?.suggestedDesire ?? 3,
      necessityLevel: analysis?.suggestedNecessity ?? 2,
      emotionalState: '',
      impulseType: analysis?.impulseType ?? 'uncertain',
      reason: '',
      cooldownHours: cooldown,
      cooldownStartedAt: now,
      cooldownEndsAt: now + cooldown * 3600000,
      status: 'cooling',
      aiAnalysis: analysis ?? undefined,
    })
    setShowNewEvent(false)
    setEvtDesc(''); setEvtAmount(''); setEvtAIResult(null); setEvtAIError('')
    setEvtGoalId('')
  }

  // ── Re-evaluation ──
  const handleResist = async () => {
    if (!reviewEvent) return
    const goalId = reviewEvent.goalId || goals[0]?.id
    await updateEvent(reviewEvent.id, {
      status: 'resisted', earnedStar: true, earnedAt: Date.now(),
      reEvaluationDesire: reviewDesire, reEvaluationNote: reviewNote.trim(),
      reEvaluationAt: Date.now(),
      goalId: goalId || reviewEvent.goalId,
    })
    if (goalId) {
      const goal = goals.find(g => g.id === goalId)
      if (goal) {
        await updateGoal(goalId, {
          currentAmount: goal.currentAmount + (reviewEvent.amount || 0),
          starCount: goal.starCount + 1,
        })
      }
    }
    setReviewEvent(null); setReviewNote(''); setShowPurchaseOptions(false)
  }

  const handleFailed = () => setShowPurchaseOptions(true)

  const handlePurchase = async () => {
    if (!reviewEvent) return
    await updateEvent(reviewEvent.id, {
      status: 'purchased', boughtAt: Date.now(),
      reEvaluationDesire: reviewDesire, reEvaluationNote: reviewNote.trim(),
      reEvaluationAt: Date.now(),
    })
    setReviewEvent(null); setReviewNote(''); setShowPurchaseOptions(false)
  }

  const handleRetryCooldown = async () => {
    if (!reviewEvent) return
    const now = Date.now()
    await updateEvent(reviewEvent.id, {
      status: 'cooling', cooldownStartedAt: now,
      cooldownEndsAt: now + reviewEvent.cooldownHours * 3600000,
      reEvaluationDesire: reviewDesire, reEvaluationNote: reviewNote.trim(),
      reEvaluationAt: Date.now(),
    })
    setReviewEvent(null); setReviewNote(''); setShowPurchaseOptions(false)
  }

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('确定删除这个冷静事件吗？')) return
    await deleteEvent(id)
  }

  // ── History ──
  const [historyFilter, setHistoryFilter] = useState<'all' | 'resisted' | 'failed'>('all')
  const filteredHistory = events.filter(e => {
    if (e.status === 'cooling' || e.status === 'pending_review') return false
    if (historyFilter === 'resisted') return e.status === 'resisted'
    if (historyFilter === 'failed') return e.status === 'failed' || e.status === 'purchased'
    return true
  }).sort((a, b) => b.createdAt - a.createdAt)

  const statusBadge = (s: CoolDownEvent['status']) => {
    const map: Record<string, { cls: string; label: string }> = {
      cooling: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: '冷却中' },
      pending_review: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: '待评估' },
      resisted: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: '已克制' },
      failed: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: '未克制' },
      purchased: { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: '已购买' },
    }
    const m = map[s] || map.cooling
    return <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${m.cls}`}>{m.label}</span>
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 slide-up pb-24 md:pb-4">
      {/* ── Tab bar ── */}
      <div className="flex bg-white/40 dark:bg-gray-800/30 rounded-2xl p-1 gap-1">
        {([
          { key: 'goals', label: '积攒目标', Icon: Target },
          { key: 'events', label: '冷静事件', Icon: ShieldCheck },
          { key: 'history', label: '历史统计', Icon: BarChart3 },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-violet-600 dark:text-violet-400' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.Icon size={16} strokeWidth={1.8} />{t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB 1: GOALS ═══════════ */}
      {tab === 'goals' && (
        <div className="space-y-4">
          {!showNewGoal ? (
            <button onClick={() => setShowNewGoal(true)}
              className="w-full border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-2xl p-4 text-violet-400 hover:border-violet-400 hover:text-violet-500 transition-all flex items-center justify-center gap-2">
              <Plus size={18} />创建新目标
            </button>
          ) : (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="h3">新积攒目标</span>
                <button onClick={() => setShowNewGoal(false)} className="btn-icon"><X size={14} /></button>
              </div>
              <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)}
                placeholder="目标名称" className="input" autoFocus />
              <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
                placeholder="目标金额" className="input" />
              <textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)}
                placeholder="为什么想攒这个目标？（可选）" className="input resize-none h-16" />
              <button onClick={handleAddGoal} disabled={!goalName.trim() || !goalTarget}
                className="btn btn-primary w-full">创建目标</button>
            </div>
          )}

          {goals.length === 0 ? (
            <div className="card p-10 text-center">
              <Target size={48} strokeWidth={1} className="text-violet-400 mx-auto mb-4" />
              <p className="text-muted text-sm">设定一个积攒目标，用冷静克制来填满它</p>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map(goal => (
                <div key={goal.id} className="card overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                          style={{ background: goal.color }}>{goal.name.charAt(0)}</div>
                        <div>
                          <h3 className="font-bold text-lg" style={{ color: goal.color }}>{goal.name}</h3>
                          {goal.description && <p className="text-xs text-muted mt-0.5">{goal.description}</p>}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="btn-icon btn-icon-danger"><Trash2 size={14} /></button>
                    </div>

                    <StarJar
                      starCount={goal.starCount}
                      targetAmount={goal.targetAmount}
                      currentAmount={goal.currentAmount}
                      color={goal.color}
                      resistedEvents={events
                        .filter(e => e.goalId === goal.id && e.status === 'resisted')
                        .map(e => ({
                          id: e.id,
                          description: e.description,
                          amount: e.amount,
                          createdAt: e.createdAt,
                          note: e.reEvaluationNote,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB 2: EVENTS ═══════════ */}
      {tab === 'events' && (
        <div className="space-y-4">
          {coolingEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                <Clock size={16} />冷却中 ({coolingEvents.length})
              </div>
              {coolingEvents.map(evt => {
                const rm = getRemaining(evt.cooldownEndsAt)
                return (
                  <div key={evt.id} className="card p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Hourglass size={18} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{evt.description}</p>
                      <p className="text-xs text-muted">
                        {evt.amount > 0 && formatAmount(evt.amount) + ' · '}
                        {evt.impulseType === 'emotional' ? '情绪消费' : evt.impulseType === 'impulsive' ? '冲动消费' : '不确定'} · 渴望 {evt.desireLevel}/5
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-mono font-bold ${rm.expired ? 'text-amber-500' : 'text-blue-600'}`}>{rm.text}</p>
                      <p className="text-xs text-muted">剩余</p>
                    </div>
                    <button onClick={() => handleDeleteEvent(evt.id)} className="btn-icon btn-icon-danger flex-shrink-0"><X size={12} /></button>
                  </div>
                )
              })}
            </div>
          )}

          {pendingReviewEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle size={16} />待评估 ({pendingReviewEvents.length})
              </div>
              {pendingReviewEvents.map(evt => (
                <div key={evt.id} className="card p-4 flex items-center gap-3 ring-2 ring-amber-300/60 dark:ring-amber-700/40">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{evt.description}</p>
                    <p className="text-xs text-muted">
                      {evt.amount > 0 && formatAmount(evt.amount) + ' · '}
                      渴望 {evt.desireLevel}/5 · 必要 {evt.necessityLevel}/5
                      {evt.aiAnalysis && <span className="ml-1 text-violet-500">AI 已分析</span>}
                    </p>
                  </div>
                  <button onClick={() => { setReviewEvent(evt); setReviewDesire(evt.desireLevel); setReviewNote(''); setShowPurchaseOptions(false) }}
                    className="btn btn-primary btn-sm flex-shrink-0">去评估</button>
                  <button onClick={() => handleDeleteEvent(evt.id)} className="btn-icon btn-icon-danger flex-shrink-0"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {coolingEvents.length === 0 && pendingReviewEvents.length === 0 && (
            <div className="card p-10 text-center">
              <ShieldCheck size={48} strokeWidth={1} className="text-violet-400 mx-auto mb-4" />
              <p className="text-muted text-sm">遇到犹豫的消费？来创建一个冷静事件</p>
            </div>
          )}

          {!showNewEvent ? (
            <button onClick={() => setShowNewEvent(true)}
              className="btn btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={18} />新建冷静事件
            </button>
          ) : (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="h3">记录消费冲动</span>
                <button onClick={() => { setShowNewEvent(false); setEvtAIResult(null); setEvtAIError('') }} className="btn-icon"><X size={14} /></button>
              </div>

              {/* Main input: free text description */}
              <textarea value={evtDesc} onChange={e => setEvtDesc(e.target.value)}
                placeholder="描述你想买的东西和原因" className="input resize-none h-20" autoFocus />
              <input type="number" value={evtAmount} onChange={e => setEvtAmount(e.target.value)}
                placeholder="价格（可选）" className="input" />

              {/* AI analysis button */}
              {!evtAIResult ? (
                <button onClick={handleAIAnalyze} disabled={!evtDesc.trim() || evtAILoading}
                  className={`w-full py-3 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    evtAILoading ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-400' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40'
                  } disabled:opacity-50`}>
                  <Zap size={16} />{evtAILoading ? 'AI 分析中...' : 'AI 心理分析'}
                </button>
              ) : (
                /* AI result card */
                <div className="bg-violet-50/50 dark:bg-violet-900/10 rounded-2xl p-3.5 space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-violet-500" />
                    <span className="text-xs text-violet-500 font-medium">AI 分析结果</span>
                    <span className="text-xs text-muted ml-auto">{Math.round(evtAIResult.confidence * 100)}% 置信</span>
                  </div>

                  <p className="text-muted leading-relaxed">{evtAIResult.summary}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2">
                      <span className="text-muted">消费类型</span>
                      <p className="font-bold text-violet-600 dark:text-violet-400">
                        {evtAIResult.impulseType === 'emotional' ? '情绪消费' : evtAIResult.impulseType === 'impulsive' ? '冲动消费' : '不确定'}
                      </p>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2">
                      <span className="text-muted">建议冷静</span>
                      <p className="font-bold text-violet-600 dark:text-violet-400">{cooldownLabel(evtAIResult.suggestedCooldown)}</p>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2">
                      <span className="text-muted">渴望程度</span>
                      <p className="font-bold text-amber-500">{evtAIResult.suggestedDesire}/5</p>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-2">
                      <span className="text-muted">必要性</span>
                      <p className="font-bold text-blue-500">{evtAIResult.suggestedNecessity}/5</p>
                    </div>
                  </div>

                  {evtAIResult.riskFactors.length > 0 && (
                    <div>
                      <span className="text-xs text-muted">风险因素</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {evtAIResult.riskFactors.map(rf => (
                          <span key={rf} className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400">{rf}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {evtAIResult.reflectionQuestions.length > 0 && (
                    <div>
                      <span className="text-xs text-muted">反思问题</span>
                      <ul className="mt-1 space-y-1">
                        {evtAIResult.reflectionQuestions.map((q, i) => (
                          <li key={i} className="text-xs text-muted italic">"{q}"</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button onClick={() => { setEvtAIResult(null); setEvtAIError('') }}
                    className="text-xs text-violet-500 hover:text-violet-600">重新分析</button>
                </div>
              )}

              {evtAIError && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 text-sm flex items-center gap-2">
                  <AlertTriangle size={14} />{evtAIError}
                  <button onClick={() => setEvtAIError('')} className="ml-auto text-xs underline">关闭</button>
                </div>
              )}

              {goals.length > 0 && (
                <select value={evtGoalId} onChange={e => setEvtGoalId(e.target.value)} className="input">
                  <option value="">不关联目标</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}

              <button onClick={handleAddEvent} disabled={!evtDesc.trim()}
                className="btn btn-primary w-full">
                <Timer size={16} />开始冷静
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB 3: HISTORY ═══════════ */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{successRate}%</p>
              <p className="text-xs text-muted mt-1">克制成功率</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-violet-500">{formatAmount(totalResistedAmount)}</p>
              <p className="text-xs text-muted mt-1">克制金额</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">{totalStars}★</p>
              <p className="text-xs text-muted mt-1">总星星数</p>
            </div>
          </div>

          <div className="flex gap-2">
            {([
              { key: 'all', label: '全部' },
              { key: 'resisted', label: '已克制' },
              { key: 'failed', label: '未克制/已购买' },
            ] as const).map(f => (
              <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  historyFilter === f.key ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium' : 'bg-gray-50 text-gray-500 dark:bg-gray-800'
                }`}>{f.label}</button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="card p-8 text-center">
              <BarChart3 size={36} strokeWidth={1} className="text-muted mx-auto mb-3" />
              <p className="text-muted text-sm">暂无记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map(evt => {
                const goal = evt.goalId ? goals.find(g => g.id === evt.goalId) : null
                return (
                  <div key={evt.id} className="card p-3.5 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      evt.status === 'resisted' ? 'bg-green-100 dark:bg-green-900/30' :
                      evt.status === 'purchased' ? 'bg-gray-100 dark:bg-gray-800' :
                      'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {evt.status === 'resisted' ? <ShieldCheck size={16} className="text-green-500" /> :
                       evt.status === 'purchased' ? <ShieldX size={16} className="text-gray-400" /> :
                       <Flame size={16} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{evt.description}</p>
                        {statusBadge(evt.status)}
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {evt.amount > 0 && formatAmount(evt.amount) + ' · '}
                        渴望 {evt.desireLevel}→{evt.reEvaluationDesire ?? '?'} · 必要 {evt.necessityLevel}/5
                        {goal && <span className="ml-1" style={{ color: goal.color }}>· {goal.name}</span>}
                      </p>
                      {evt.reEvaluationNote && <p className="text-xs text-muted mt-0.5 italic">"{evt.reEvaluationNote}"</p>}
                    </div>
                    <span className="text-xs text-muted flex-shrink-0">{formatDateStr(evt.createdAt)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ RE-EVALUATION MODAL ═══════════ */}
      {reviewEvent && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => { setReviewEvent(null); setShowPurchaseOptions(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl slide-up"
            onClick={e => e.stopPropagation()}>
            {!showPurchaseOptions ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck size={32} className="text-violet-500" />
                  </div>
                  <h2 className="h2">冷静之后，你还想要吗？</h2>
                  <p className="text-sm text-muted mt-1">冷静期已过，回顾你的感受</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">想买</span>
                    <span className="font-bold">{reviewEvent.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">价格</span>
                    <span className="font-medium">{reviewEvent.amount > 0 ? formatAmount(reviewEvent.amount) : '未填写'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">原始渴望</span>
                    <span className="font-bold text-amber-500">{'★'.repeat(reviewEvent.desireLevel)}{'☆'.repeat(5 - reviewEvent.desireLevel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">原始必要性</span>
                    <span className="font-bold text-blue-500">{'★'.repeat(reviewEvent.necessityLevel)}{'☆'.repeat(5 - reviewEvent.necessityLevel)}</span>
                  </div>
                  {reviewEvent.aiAnalysis?.summary && (
                    <p className="text-xs text-muted italic mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">{reviewEvent.aiAnalysis.summary}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted">现在的渴望程度</span>
                    <span className="font-bold text-violet-500">{reviewDesire}/5</span>
                  </div>
                  <input type="range" min="1" max="5" value={reviewDesire} onChange={e => setReviewDesire(parseInt(e.target.value))}
                    className="w-full accent-violet-500" />
                </div>

                <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                  placeholder="冷静后的感受或反思" className="input resize-none h-20" />

                <div className="space-y-2">
                  <button onClick={handleResist} className="btn btn-primary w-full text-base py-3">
                    <ShieldCheck size={18} />克制成功
                  </button>
                  <button onClick={handleFailed} className="btn btn-secondary w-full text-base py-3">
                    <Flame size={18} />我还是想买
                  </button>
                  <button onClick={handleRetryCooldown} className="w-full text-sm text-muted hover:text-violet-500 py-2 transition-colors">
                    再冷静一下
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                    <Flame size={32} className="text-red-400" />
                  </div>
                  <h2 className="h2">冷静后依然想要</h2>
                  <p className="text-sm text-muted mt-1">这可能说明这笔消费有一定的合理性</p>
                </div>

                <div className="space-y-2">
                  <button onClick={handlePurchase} className="btn btn-primary w-full text-base py-3">
                    标记为已购买
                  </button>
                  <button onClick={handleRetryCooldown} className="btn btn-secondary w-full text-base py-3">
                    <Timer size={18} />再冷静一下
                  </button>
                  <button onClick={() => setShowPurchaseOptions(false)}
                    className="w-full text-sm text-muted hover:text-violet-500 py-2 transition-colors">返回</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
