import { useState, useEffect } from 'react'
import { useJarGoals, useCoolDownEvents } from '@/db/hooks'
import type { CoolDownEvent } from '@/types'
import StarJar from '@/components/StarJar'
import { formatAmount } from '@/lib/utils'
import {
  Target, Plus, X, Trash2, Star,
  Timer, Clock, ShieldCheck, ShieldX, Flame,
  Hourglass, BarChart3, AlertTriangle,
} from '@/lib/icons'

const COOLDOWN_PRESETS = [
  { label: '1 小时', hours: 1 },
  { label: '6 小时', hours: 6 },
  { label: '24 小时', hours: 24 },
  { label: '3 天', hours: 72 },
  { label: '7 天', hours: 168 },
]

const IMPULSE_TYPES: { value: CoolDownEvent['impulseType']; label: string }[] = [
  { value: 'emotional', label: '情绪消费' },
  { value: 'impulsive', label: '冲动消费' },
  { value: 'uncertain', label: '不确定' },
]

const GOAL_COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#f43f5e', '#3b82f6', '#ec4899', '#14b8a6']

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

  // New goal form
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalDesc, setGoalDesc] = useState('')

  // New cool-down event form
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [evtDesc, setEvtDesc] = useState('')
  const [evtAmount, setEvtAmount] = useState('')
  const [evtDesire, setEvtDesire] = useState(3)
  const [evtNecessity, setEvtNecessity] = useState(2)
  const [evtEmotion, setEvtEmotion] = useState('')
  const [evtImpulseType, setEvtImpulseType] = useState<CoolDownEvent['impulseType']>('uncertain')
  const [evtReason, setEvtReason] = useState('')
  const [evtGoalId, setEvtGoalId] = useState('')
  const [evtCooldown, setEvtCooldown] = useState(24)

  // Re-evaluation modal
  const [reviewEvent, setReviewEvent] = useState<CoolDownEvent | null>(null)
  const [reviewDesire, setReviewDesire] = useState(3)
  const [reviewNote, setReviewNote] = useState('')
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false)

  // Timer
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000)
    return () => clearInterval(id)
  }, [])

  // Auto-transition expired events
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

  // ── Event handlers ──
  const handleAddEvent = async () => {
    if (!evtDesc.trim()) return
    const now = Date.now()
    await addEvent({
      goalId: evtGoalId || undefined,
      description: evtDesc.trim(),
      amount: parseFloat(evtAmount) || 0,
      desireLevel: evtDesire,
      necessityLevel: evtNecessity,
      emotionalState: evtEmotion.trim(),
      impulseType: evtImpulseType,
      reason: evtReason.trim(),
      cooldownHours: evtCooldown,
      cooldownStartedAt: now,
      cooldownEndsAt: now + evtCooldown * 3600000,
      status: 'cooling',
    })
    setShowNewEvent(false)
    setEvtDesc(''); setEvtAmount(''); setEvtDesire(3); setEvtNecessity(2)
    setEvtEmotion(''); setEvtImpulseType('uncertain'); setEvtReason('')
    setEvtGoalId(''); setEvtCooldown(24)
  }

  const handleResist = async () => {
    if (!reviewEvent) return
    const goalId = reviewEvent.goalId || goals[0]?.id
    await updateEvent(reviewEvent.id, {
      status: 'resisted',
      earnedStar: true,
      earnedAt: Date.now(),
      reEvaluationDesire: reviewDesire,
      reEvaluationNote: reviewNote.trim(),
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
    setReviewEvent(null)
    setReviewNote('')
    setShowPurchaseOptions(false)
  }

  const handleFailed = async () => {
    if (!reviewEvent) return
    setShowPurchaseOptions(true)
  }

  const handlePurchase = async () => {
    if (!reviewEvent) return
    await updateEvent(reviewEvent.id, {
      status: 'purchased',
      boughtAt: Date.now(),
      reEvaluationDesire: reviewDesire,
      reEvaluationNote: reviewNote.trim(),
      reEvaluationAt: Date.now(),
    })
    setReviewEvent(null)
    setReviewNote('')
    setShowPurchaseOptions(false)
  }

  const handleRetryCooldown = async () => {
    if (!reviewEvent) return
    const now = Date.now()
    await updateEvent(reviewEvent.id, {
      status: 'cooling',
      cooldownStartedAt: now,
      cooldownEndsAt: now + reviewEvent.cooldownHours * 3600000,
      reEvaluationDesire: reviewDesire,
      reEvaluationNote: reviewNote.trim(),
      reEvaluationAt: Date.now(),
    })
    setReviewEvent(null)
    setReviewNote('')
    setShowPurchaseOptions(false)
  }

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('确定删除这个冷静事件吗？')) return
    await deleteEvent(id)
  }

  // ── History filter ──
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

      {/* ═══════════════════════ TAB 1: GOALS ═══════════════════════ */}
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
                placeholder="目标名称，如：买 Nintendo Switch" className="input" autoFocus />
              <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
                placeholder="目标金额，如：2000" className="input" />
              <textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)}
                placeholder="为什么想攒这个目标？（可选）" className="input resize-none h-16" />
              <button onClick={handleAddGoal} disabled={!goalName.trim() || !goalTarget}
                className="btn btn-primary w-full">创建目标</button>
            </div>
          )}

          {goals.length === 0 ? (
            <div className="card p-10 text-center">
              <Target size={48} strokeWidth={1} className="text-violet-400 mx-auto mb-4" />
              <p className="text-muted text-sm mb-4">设定一个积攒目标，用冷静克制来填满它</p>
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

                    <StarJar starCount={goal.starCount} targetAmount={goal.targetAmount} currentAmount={goal.currentAmount} />

                    {/* Contributing events */}
                    {(() => {
                      const resistEvents = events.filter(e => e.goalId === goal.id && e.status === 'resisted')
                      if (resistEvents.length === 0) return null
                      return (
                        <div className="mt-4 border-t border-gray-100 dark:border-gray-800/30 divide-y divide-gray-50 dark:divide-gray-800/20 max-h-40 overflow-y-auto">
                          {resistEvents.map(evt => (
                            <div key={evt.id} className="flex items-center gap-2 px-1 py-1.5 text-xs">
                              <Star size={12} className="text-amber-400 flex-shrink-0" fill="#fbbf24" />
                              <span className="flex-1 truncate">{evt.description}</span>
                              <span className="text-muted">{evt.amount > 0 ? formatAmount(evt.amount) : ''}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ TAB 2: COOL-DOWN EVENTS ═══════════════════════ */}
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
                        渴望 {evt.desireLevel}/5 · 必要 {evt.necessityLevel}/5
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
                <div key={evt.id} className="card p-4 flex items-center gap-3 border-amber-300 dark:border-amber-700">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{evt.description}</p>
                    <p className="text-xs text-muted">
                      {evt.amount > 0 && formatAmount(evt.amount) + ' · '}
                      渴望 {evt.desireLevel}/5 · 必要 {evt.necessityLevel}/5
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
              <p className="text-muted text-sm mb-4">遇到犹豫的消费？来创建一个冷静事件</p>
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
                <button onClick={() => setShowNewEvent(false)} className="btn-icon"><X size={14} /></button>
              </div>

              <input type="text" value={evtDesc} onChange={e => setEvtDesc(e.target.value)}
                placeholder="想买什么？如：一双限量球鞋" className="input" autoFocus />
              <input type="number" value={evtAmount} onChange={e => setEvtAmount(e.target.value)}
                placeholder="价格（如：1299）" className="input" />

              <div>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>渴望程度</span><span className="font-bold text-amber-500">{evtDesire}/5</span>
                </div>
                <input type="range" min="1" max="5" value={evtDesire} onChange={e => setEvtDesire(parseInt(e.target.value))}
                  className="w-full accent-amber-500" />
                <div className="flex justify-between text-xs text-muted"><span>只是看看</span><span>非常想要</span></div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>必要性</span><span className="font-bold text-blue-500">{evtNecessity}/5</span>
                </div>
                <input type="range" min="1" max="5" value={evtNecessity} onChange={e => setEvtNecessity(parseInt(e.target.value))}
                  className="w-full accent-blue-500" />
                <div className="flex justify-between text-xs text-muted"><span>完全不必</span><span>确实需要</span></div>
              </div>

              <input type="text" value={evtEmotion} onChange={e => setEvtEmotion(e.target.value)}
                placeholder="当前情绪状态（如：焦虑、无聊、兴奋...）" className="input" />

              <div>
                <label className="text-xs text-muted block mb-1.5">消费类型</label>
                <div className="flex gap-2">
                  {IMPULSE_TYPES.map(t => (
                    <button key={t.value} onClick={() => setEvtImpulseType(t.value)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        evtImpulseType === t.value ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-800'
                      }`}>{t.label}</button>
                  ))}
                </div>
              </div>

              <textarea value={evtReason} onChange={e => setEvtReason(e.target.value)}
                placeholder="想买的理由（可选）" className="input resize-none h-16" />

              {goals.length > 0 && (
                <select value={evtGoalId} onChange={e => setEvtGoalId(e.target.value)} className="input">
                  <option value="">不关联目标（可后续再选）</option>
                  {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}

              <div>
                <label className="text-xs text-muted block mb-1.5">冷静周期</label>
                <div className="flex flex-wrap gap-1.5">
                  {COOLDOWN_PRESETS.map(p => (
                    <button key={p.hours} onClick={() => setEvtCooldown(p.hours)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        evtCooldown === p.hours ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium' : 'bg-gray-50 text-gray-500 dark:bg-gray-800 hover:bg-gray-100'
                      }`}>{p.label}</button>
                  ))}
                </div>
              </div>

              <button onClick={handleAddEvent} disabled={!evtDesc.trim()} className="btn btn-primary w-full">
                <Timer size={16} />开始冷静
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ TAB 3: HISTORY ═══════════════════════ */}
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
              <p className="text-2xl font-bold text-amber-500">{totalStars}⭐</p>
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

      {/* ═══════════════════════ RE-EVALUATION MODAL ═══════════════════════ */}
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
                  {reviewEvent.emotionalState && (
                    <div className="flex justify-between">
                      <span className="text-muted">当时情绪</span><span>{reviewEvent.emotionalState}</span>
                    </div>
                  )}
                  {reviewEvent.reason && (
                    <div className="flex justify-between">
                      <span className="text-muted">当时理由</span>
                      <span className="text-right max-w-[60%]">{reviewEvent.reason}</span>
                    </div>
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
                  placeholder="冷静后的感受或反思（可选）" className="input resize-none h-20" />

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
                    我会去购买（标记为已购买）
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
