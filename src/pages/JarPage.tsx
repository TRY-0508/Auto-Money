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

const GOAL_COLORS = ['#f59e0b', '#d97706', '#10b981', '#f43f5e', '#3b82f6', '#ec4899', '#14b8a6', '#eab308', '#fb923c']

function cooldownLabel(h: number): string {
  const m: Record<number, string> = { 1: '1 小时', 6: '6 小时', 24: '1 天', 48: '2 天', 72: '3 天', 168: '7 天' }
  return m[h] || `${h} 小时`
}

function getRemaining(endsAt: number): { text: string; expired: boolean } {
  const ms = endsAt - Date.now()
  if (ms <= 0) return { text: '时间到', expired: true }
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return { text: `${h}时${m}分`, expired: false }
  if (m > 0) return { text: `${m}分${s}秒`, expired: false }
  return { text: `${s}秒`, expired: false }
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Tab = 'goals' | 'events' | 'history'

export default function JarPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useJarGoals()
  const { events, addEvent, updateEvent, deleteEvent } = useCoolDownEvents()

  const [tab, setTab] = useState<Tab>('goals')
  const [tick, setTick] = useState(0)
  const [tabKey, setTabKey] = useState(0) // for transition animation

  const switchTab = (t: Tab) => { setTabKey(k => k + 1); setTab(t) }

  // New goal
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDesc, setGoalDesc] = useState('')

  // New event
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [evtDesc, setEvtDesc] = useState('')
  const [evtAmount, setEvtAmount] = useState('')
  const [evtAILoading, setEvtAILoading] = useState(false)
  const [evtAIResult, setEvtAIResult] = useState<CoolDownAIAnalysis | null>(null)
  const [evtAIError, setEvtAIError] = useState('')
  const [evtGoalId, setEvtGoalId] = useState('')
  const [evtCooldownHours, setEvtCooldownHours] = useState(24)

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
      currentAmount: 0, starCount: 0,
      description: goalDesc.trim(),
      color: GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)],
    })
    setShowNewGoal(false)
    setGoalName(''); setGoalTarget(''); setGoalDesc('')
  }

  const handleDeleteGoal = async (id: string) => {
    const goalEvents = events.filter(e => e.goalId === id && (e.status === 'cooling' || e.status === 'pending_review'))
    if (goalEvents.length > 0) {
      if (!window.confirm(`该心愿下还有 ${goalEvents.length} 个未完成的冷却事件，确定删除吗？`)) return
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
      setEvtCooldownHours(result.suggestedCooldown || 24)
    } catch (err: any) {
      setEvtAIError(err.message || '分析失败，请检查 API 配置')
    } finally { setEvtAILoading(false) }
  }

  const handleAddEvent = async () => {
    if (!evtDesc.trim()) return
    const analysis = evtAIResult
    const now = Date.now()
    const cooldown = evtCooldownHours
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
    setEvtGoalId(''); setEvtCooldownHours(24)
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
    if (!window.confirm('确定删除这个冷却事件吗？')) return
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
      cooling:     { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',   label: '冷却中' },
      pending_review: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-accent', label: '等待确认' },
      resisted:    { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: '已守住' },
      failed:      { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       label: '已释怀' },
      purchased:   { cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',       label: '已购买' },
    }
    const m = map[s] || map.cooling
    return <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${m.cls}`}>{m.label}</span>
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 slide-up pb-24 md:pb-4">
      {/* ── Tab bar ── */}
      <div className="flex bg-white/40 dark:bg-gray-800/30 rounded-2xl p-1 gap-1">
        {([
          { key: 'goals' as Tab, label: '心愿', Icon: Target },
          { key: 'events' as Tab, label: '欲望冷却', Icon: ShieldCheck },
          { key: 'history' as Tab, label: '成长轨迹', Icon: BarChart3 },
        ]).map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-accent dark:text-accent scale-[1.02]' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.Icon size={16} strokeWidth={1.8} />{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content with fade transition ── */}
      <div key={tabKey} className="animate-[fadeSlide_0.25s_ease-out]">
      <style>{`@keyframes fadeSlide { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* ═══════════ TAB 1: GOALS ═══════════ */}
      {tab === 'goals' && (
        <div className="space-y-4">
          {!showNewGoal ? (
            <button onClick={() => setShowNewGoal(true)}
              className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-4 text-gray-400 hover:border-gray-400 hover:text-gray-500 dark:hover:border-gray-500 dark:hover:text-gray-400 transition-all flex items-center justify-center gap-2">
              <Plus size={18} />创建心愿
            </button>
          ) : (
            <div className="card card-accent p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="h3">新心愿</span>
                <button onClick={() => setShowNewGoal(false)} className="btn-icon"><X size={14} /></button>
              </div>
              <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)}
                placeholder="心愿名称" className="input" autoFocus />
              <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
                placeholder="心愿金额" className="input" />
              <textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)}
                placeholder="为什么想实现它？（可选）" className="input resize-none h-16" />
              <button onClick={handleAddGoal} disabled={!goalName.trim() || !goalTarget}
                className="btn btn-primary w-full">创建心愿</button>
            </div>
          )}

          {goals.length === 0 ? (
            <div className="card card-soft p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--c-primary-soft)] flex items-center justify-center mx-auto mb-5">
                <Target size={32} strokeWidth={1.2} className="text-accent"/>
              </div>
              <p className="text-base font-semibold mb-1">设定一个心愿</p>
              <p className="text-sm text-muted leading-relaxed mb-5">每次面对冲动时的清醒选择都是一束星光<br/>星光汇聚，点亮你真正想要抵达的地方</p>
              <div className="text-left text-xs text-muted bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 max-w-xs mx-auto space-y-1.5">
                <p className="font-medium text-gray-500 mb-1">使用流程：</p>
                <p>1. 创建心愿（如：旅行基金 ¥5000）</p>
                <p>2. 切换到「欲望冷却」记录冲动</p>
                <p>3. 冷静后守住 → 星光+金额自动计入</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map(goal => (
                <div key={goal.id} className="card card-accent overflow-hidden">
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
                const total = evt.cooldownEndsAt - evt.cooldownStartedAt
                const elapsed = Date.now() - evt.cooldownStartedAt
                const elapsedPct = total > 0 ? Math.min((elapsed / total) * 100, 99) : 0
                const ringR = 15; const ringC = 2 * Math.PI * ringR
                const timerColor = elapsedPct > 80 ? '#ef4444' : elapsedPct > 50 ? '#f59e0b' : '#3b82f6'
                return (
                   <div key={evt.id} className="card card-list p-4 flex items-center gap-3">
                    <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 38 38" className="w-full h-full -rotate-90">
                        <circle cx="19" cy="19" r={ringR} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
                        <circle cx="19" cy="19" r={ringR} fill="none" stroke={timerColor} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={ringC} strokeDashoffset={ringC - (elapsedPct / 100) * ringC}
                          className="transition-all duration-1000 ease-linear"
                          style={{ filter: `drop-shadow(0 0 3px ${timerColor}40)` }} />
                      </svg>
                      <Hourglass size={14} className="absolute text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{evt.description}</p>
                      <p className="text-xs text-muted">
                        {evt.amount > 0 && formatAmount(evt.amount) + ' · '}
                        {evt.impulseType === 'emotional' ? '情绪消费' : evt.impulseType === 'impulsive' ? '冲动消费' : '不确定'} · 渴望 {evt.desireLevel}/5
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-mono font-bold ${rm.expired ? 'text-accent' : 'text-blue-600'}`}>{rm.text}</p>
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
              <div className="flex items-center gap-2 text-sm font-medium text-accent dark:text-accent">
                <AlertTriangle size={16} />等待确认 ({pendingReviewEvents.length})
              </div>
              {pendingReviewEvents.map(evt => (
                <div key={evt.id} className="card card-list p-4 flex items-center gap-3 breathe border-amber-300/60 dark:border-amber-700/40">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{evt.description}</p>
                    <p className="text-xs text-muted">
                      {evt.amount > 0 && formatAmount(evt.amount) + ' · '}
                      渴望 {evt.desireLevel}/5 · 必要 {evt.necessityLevel}/5
                      {evt.aiAnalysis && <span className="ml-1 text-accent">AI 已分析</span>}
                    </p>
                  </div>
                  <button onClick={() => { setReviewEvent(evt); setReviewDesire(evt.desireLevel); setReviewNote(''); setShowPurchaseOptions(false) }}
                    className="btn btn-primary btn-sm flex-shrink-0">去看看</button>
                  <button onClick={() => handleDeleteEvent(evt.id)} className="btn-icon btn-icon-danger flex-shrink-0"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {coolingEvents.length === 0 && pendingReviewEvents.length === 0 && (
            <div className="card card-soft p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--c-primary-soft)] flex items-center justify-center mx-auto mb-5">
                <ShieldCheck size={32} strokeWidth={1.2} className="text-accent"/>
              </div>
              <p className="text-base font-semibold mb-1">还没有冷却事件</p>
              <p className="text-sm text-muted leading-relaxed">遇到让你犹豫的消费冲动？<br/>点击下方按钮，让 AI 帮你分析、给自己一段冷静时间</p>
            </div>
          )}

          {!showNewEvent ? (
            <button onClick={() => setShowNewEvent(true)}
              className="btn btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={18} />记录冲动
            </button>
          ) : (
            <div className="card card-accent p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="h3">记录消费冲动</span>
                <button onClick={() => { setShowNewEvent(false); setEvtAIResult(null); setEvtAIError('') }} className="btn-icon"><X size={14} /></button>
              </div>

              <textarea value={evtDesc} onChange={e => setEvtDesc(e.target.value)}
                placeholder="描述你想买的东西和原因" className="input resize-none h-20" autoFocus />
              <input type="number" value={evtAmount} onChange={e => setEvtAmount(e.target.value)}
                placeholder="价格（可选）" className="input" />

              {!evtAIResult ? (
                <button onClick={handleAIAnalyze} disabled={!evtDesc.trim() || evtAILoading}
                  className={`w-full py-3 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    evtAILoading ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-gray-100 dark:bg-gray-800 text-accent dark:text-accent hover:bg-gray-200 dark:hover:bg-gray-700'
                  } disabled:opacity-50`}>
                  <Zap size={16} className={evtAILoading ? 'animate-pulse' : ''} />
                  {evtAILoading ? '分析中...' : 'AI 心理分析'}
                </button>
              ) : (
                <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl p-3.5 space-y-3 text-sm border border-gray-100/60 dark:border-gray-700/30">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-accent" />
                    <span className="text-xs text-accent font-medium">AI 分析</span>
                    <span className="text-xs text-muted ml-auto">{Math.round(evtAIResult.confidence * 100)}%</span>
                  </div>
                  <p className="text-muted leading-relaxed">{evtAIResult.summary}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-2">
                      <span className="text-muted">类型</span>
                      <p className="font-bold text-accent">{evtAIResult.impulseType === 'emotional' ? '情绪消费' : evtAIResult.impulseType === 'impulsive' ? '冲动消费' : '不确定'}</p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-2">
                      <span className="text-muted">建议冷却</span>
                      <p className="font-bold text-teal-600 dark:text-teal-400">{cooldownLabel(evtAIResult.suggestedCooldown)}</p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-2">
                      <span className="text-muted">渴望度</span>
                      <p className="font-bold text-accent">{evtAIResult.suggestedDesire}/5</p>
                    </div>
                    <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-2">
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
                    <div className="text-xs">
                      <span className="text-muted">冷静时想想</span>
                      {evtAIResult.reflectionQuestions.map((q, i) => (
                        <p key={i} className="mt-1 text-muted italic leading-relaxed">&ldquo;{q}&rdquo;</p>
                      ))}
                    </div>
                  )}
                   <button onClick={() => { setEvtAIResult(null); setEvtAIError('') }}
                     className="text-xs text-accent hover:brightness-90">重新分析</button>
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
                  <option value="">不关联心愿</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">冷却时间</span>
                  <span className="text-xs font-medium text-accent">{cooldownLabel(evtCooldownHours)}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[6, 12, 24, 48, 72, 168].map(h => (
                    <button key={h} onClick={() => setEvtCooldownHours(h)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        evtCooldownHours === h
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-accent ring-1 ring-amber-300'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}>{cooldownLabel(h)}</button>
                  ))}
                </div>
              </div>

              <button onClick={handleAddEvent} disabled={!evtDesc.trim()}
                className="btn btn-primary w-full">
                <Timer size={16} />开始冷却
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB 3: HISTORY ═══════════ */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card card-stat p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{successRate}%</p>
              <p className="text-xs text-muted mt-1">守住率</p>
            </div>
            <div className="card card-stat p-3 text-center">
              <p className="text-2xl font-bold text-accent">{formatAmount(totalResistedAmount)}</p>
              <p className="text-xs text-muted mt-1">守住金额</p>
            </div>
            <div className="card card-stat p-3 text-center">
              <p className="text-2xl font-bold text-accent">{totalStars}</p>
              <p className="text-xs text-muted mt-1">星光总数</p>
            </div>
          </div>

          <div className="flex gap-2">
            {([
              { key: 'all' as const, label: '全部' },
              { key: 'resisted' as const, label: '已守住' },
              { key: 'failed' as const, label: '已释怀' },
            ]).map(f => (
              <button key={f.key} onClick={() => setHistoryFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  historyFilter === f.key ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-accent font-medium' : 'bg-gray-50 text-gray-500 dark:bg-gray-800'
                }`}>{f.label}</button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
              <div className="card card-soft p-8 text-center">
              <BarChart3 size={36} strokeWidth={1} className="text-muted mx-auto mb-3 animate-[float_3s_ease-in-out_infinite]" />
              <p className="text-muted text-sm">暂无记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((evt, idx) => {
                const goal = evt.goalId ? goals.find(g => g.id === evt.goalId) : null
                return (
                  <div key={evt.id} className="card card-list p-3.5 flex items-center gap-3"
                    style={{ animationDelay: `${idx * 30}ms` }}>
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
                        渴望 {evt.desireLevel}→{evt.reEvaluationDesire ?? '?'}
                        {goal && <span className="ml-1" style={{ color: goal.color }}>· {goal.name}</span>}
                      </p>
                      {evt.reEvaluationNote && <p className="text-xs text-muted mt-0.5 italic">&ldquo;{evt.reEvaluationNote}&rdquo;</p>}
                    </div>
                    <span className="text-xs text-muted flex-shrink-0">{fmtDate(evt.createdAt)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      </div>{/* end fade transition wrapper */}

      {/* ═══════════ RE-EVALUATION MODAL ═══════════ */}
      {reviewEvent && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => { setReviewEvent(null); setShowPurchaseOptions(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-[popIn_0.25s_cubic-bezier(0.34,1.56,0.64,1)]"
            onClick={e => e.stopPropagation()}>
            <style>{`@keyframes popIn { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }`}</style>
            {!showPurchaseOptions ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck size={32} className="text-accent" />
                  </div>
                  <h2 className="h2">冷静之后，你的决定是？</h2>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">想要</span>
                    <span className="font-bold">{reviewEvent.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">价格</span>
                    <span className="font-medium">{reviewEvent.amount > 0 ? formatAmount(reviewEvent.amount) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">冷却前渴望</span>
                    <span className="font-bold text-accent">{'★'.repeat(reviewEvent.desireLevel)}{'☆'.repeat(5 - reviewEvent.desireLevel)}</span>
                  </div>
                  {reviewEvent.aiAnalysis?.summary && (
                    <p className="text-xs text-muted italic mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">{reviewEvent.aiAnalysis.summary}</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted">现在的渴望程度</span>
                    <span className="font-bold text-accent">{reviewDesire}/5</span>
                  </div>
                  <input type="range" min="1" max="5" value={reviewDesire} onChange={e => setReviewDesire(parseInt(e.target.value))}
                    className="w-full accent-amber-500" />
                </div>

                <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                  placeholder="说说现在的感受" className="input resize-none h-20" />

                <div className="space-y-2">
                  <button onClick={handleResist} className="btn btn-primary w-full text-base py-3">
                    <ShieldCheck size={18} />守住它
                  </button>
                  <button onClick={() => setShowPurchaseOptions(true)} className="btn btn-secondary w-full text-base py-3">
                    <Flame size={18} />还是想要
                  </button>
                  <button onClick={handleRetryCooldown} className="w-full text-sm text-muted hover:text-accent py-2 transition-colors">
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
                  <h2 className="h2">还想要也没关系</h2>
                  <p className="text-sm text-muted mt-1">冷静后仍然想要的，也许真的值得</p>
                </div>

                <div className="space-y-2">
                  <button onClick={handlePurchase} className="btn btn-primary w-full text-base py-3">
                    标记为已购买
                  </button>
                  <button onClick={handleRetryCooldown} className="btn btn-secondary w-full text-base py-3">
                    <Timer size={18} />再冷静一下
                  </button>
                  <button onClick={() => setShowPurchaseOptions(false)}
                    className="w-full text-sm text-muted hover:text-accent py-2 transition-colors">返回</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
