import { useState } from 'react'
import Popup from '@/components/Popup'
import { formatAmount } from '@/lib/utils'

interface ResistRecord {
  id: string
  description: string
  amount: number
  createdAt: number
  note?: string
}

interface Props {
  starCount: number
  targetAmount: number
  currentAmount: number
  color: string
  resistedEvents: ResistRecord[]
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StarJar({ starCount, targetAmount, currentAmount, color, resistedEvents }: Props) {
  const [selected, setSelected] = useState<ResistRecord | null>(null)
  const fillPercent = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0
  const starSize = 24
  const maxPerRow = 7

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-muted">已攒</span>
          <span className="font-bold" style={{ color }}>¥{Math.round(currentAmount)} / ¥{Math.round(targetAmount)}</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-700 ease-out"
            style={{ width: `${fillPercent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>{starCount} 次克制</span>
          <span>{Math.round(fillPercent)}%</span>
        </div>
      </div>

      {/* Star grid */}
      {starCount > 0 ? (
        <div className="bg-gray-50/60 dark:bg-gray-800/30 rounded-2xl p-3">
          <div className="flex flex-wrap justify-center gap-2"
            style={{ maxWidth: `${maxPerRow * (starSize + 8)}px`, margin: '0 auto' }}>
            {resistedEvents.map((evt, i) => (
              <button
                key={evt.id}
                onClick={() => setSelected(evt)}
                className="relative group transition-all hover:scale-125 active:scale-95"
                title={evt.description}
              >
                <svg width={starSize} height={starSize} viewBox="0 0 24 24">
                  <defs>
                    <radialGradient id={`sg-${i}`} cx="40%" cy="30%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="60%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </radialGradient>
                    <filter id={`glow-${i}`}>
                      <feGaussianBlur stdDeviation="0.6" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <polygon
                    points="12,1.5 15.3,8.8 23,9.5 17.5,14.8 19,22 12,18 5,22 6.5,14.8 1,9.5 8.7,8.8"
                    fill={`url(#sg-${i})`}
                    filter={`url(#glow-${i})`}
                    stroke="#d97706"
                    strokeWidth="0.3"
                  />
                  <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.35)" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-muted">还没有克制记录</p>
          <p className="text-xs text-muted mt-1">每次成功克制都会获得一颗星星</p>
        </div>
      )}

      {/* Popup: event detail */}
      <Popup open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <polygon points="12,1.5 15.3,8.8 23,9.5 17.5,14.8 19,22 12,18 5,22 6.5,14.8 1,9.5 8.7,8.8"
                  fill="#fbbf24" stroke="#d97706" strokeWidth="0.3" />
              </svg>
              <span className="font-bold text-amber-600 dark:text-amber-400">克制记录</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted">想买</span>
                <span className="font-medium">{selected.description}</span>
              </div>
              {selected.amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">省下</span>
                  <span className="font-medium text-green-600">{formatAmount(selected.amount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">时间</span>
                <span>{formatDate(selected.createdAt)}</span>
              </div>
              {selected.note && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-muted text-xs">反思</span>
                  <p className="text-xs mt-0.5 italic">&ldquo;{selected.note}&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Popup>
    </div>
  )
}
