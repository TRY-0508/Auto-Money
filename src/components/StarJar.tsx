import { useState, useEffect } from 'react'
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

export default function StarJar({ starCount, targetAmount, currentAmount, color, resistedEvents }: Props) {
  const [selected, setSelected] = useState<ResistRecord | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const fillPercent = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0
  const ringR = 54
  const ringCircumference = 2 * Math.PI * ringR

  // Seeds for consistent but random-feeling star positions
  const starPositions = Array.from({ length: starCount }).map((_, i) => {
    const seed = i * 137.508
    const orbit = 58 + (i % 3) * 12 + Math.sin(i * 0.7) * 8
    const angle = (seed % 360) * (Math.PI / 180)
    return { x: Math.cos(angle) * orbit, y: Math.sin(angle) * orbit }
  })

  return (
    <div className="space-y-4">
      {/* Progress ring + star tokens */}
      <div className="flex justify-center">
        <div className="relative w-40 h-40">
          {/* Background ring */}
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            <circle cx="70" cy="70" r={ringR}
              fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="6" />
            {/* Progress ring */}
            <circle cx="70" cy="70" r={ringR}
              fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringCircumference - (fillPercent / 100) * ringCircumference}
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
            />
            {/* Inner gradient ring for depth */}
            <circle cx="70" cy="70" r={ringR}
              fill="none" stroke={`url(#ringGrad-${color.replace('#', '')})`}
              strokeWidth="3" strokeLinecap="round" opacity="0.6"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringCircumference - (fillPercent / 100) * ringCircumference}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id={`ringGrad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="50%" stopColor={color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={color} stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold" style={{ color }}>¥{Math.round(currentAmount)}</span>
            <span className="text-[10px] text-muted mt-0.5">/ ¥{Math.round(targetAmount)}</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-accent">{starCount}</span>
              <span className="text-[10px] text-muted">次守住</span>
            </div>
          </div>

          {/* Star tokens */}
          {starPositions.map((pos, i) => {
            const evt = resistedEvents[i]
            if (!evt) return null
            const size = 18 + Math.sin(i * 0.8) * 4
            const delay = i * 0.15
            const dur = 3 + (i % 3) * 1.5
            return (
              <button
                key={evt.id}
                onClick={() => setSelected(evt)}
                onMouseEnter={() => setHovered(evt.id)}
                onMouseLeave={() => setHovered(null)}
                className="absolute transition-transform duration-200"
                style={{
                  left: `calc(50% + ${pos.x}px)`,
                  top: `calc(50% + ${pos.y}px)`,
                  transform: `translate(-50%, -50%) scale(${hovered === evt.id ? 1.3 : 1})`,
                  animation: `starFloat ${dur}s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                  zIndex: hovered === evt.id ? 10 : 1,
                }}
              >
                <svg width={size} height={size} viewBox="0 0 24 24">
                  <defs>
                    <radialGradient id={`sg-${i}`} cx="38%" cy="28%">
                      <stop offset="0%" stopColor="#fff9c4" />
                      <stop offset="35%" stopColor="#ffd54f" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </radialGradient>
                    <filter id={`sf-${i}`}>
                      <feGaussianBlur stdDeviation="0.4" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <polygon
                    points="12,1.5 15.3,8.8 23,9.5 17.5,14.8 19,22 12,18 5,22 6.5,14.8 1,9.5 8.7,8.8"
                    fill={`url(#sg-${i})`}
                    filter={`url(#sf-${i})`}
                  />
                  <circle cx="10" cy="10" r="2.5" fill="rgba(255,255,255,0.3)" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>

      {/* Percent label */}
      <p className="text-center text-xs text-muted">{Math.round(fillPercent)}% 达成 {fillPercent >= 100 && <span className="text-accent font-bold bounce-in">!</span>}</p>

      {/* Popup */}
      <Popup open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-3">
            <div className="text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" className="mx-auto mb-1">
                <defs>
                  <radialGradient id="psg" cx="38%" cy="28%">
                    <stop offset="0%" stopColor="#fff9c4" />
                    <stop offset="35%" stopColor="#ffd54f" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </radialGradient>
                </defs>
                <polygon points="12,1.5 15.3,8.8 23,9.5 17.5,14.8 19,22 12,18 5,22 6.5,14.8 1,9.5 8.7,8.8" fill="url(#psg)" />
              </svg>
              <span className="text-sm font-bold text-accent dark:text-accent">守住记录</span>
            </div>

            <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-xl p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">想买</span>
                <span className="font-medium">{selected.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">省下</span>
                <span className="font-medium text-green-600">{selected.amount > 0 ? formatAmount(selected.amount) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">时间</span>
                <span className="text-xs">{new Date(selected.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
              {selected.note && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-muted text-xs">当时反思</span>
                  <p className="text-xs mt-0.5 italic leading-relaxed">&ldquo;{selected.note}&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Popup>

      <style>{`
        @keyframes starFloat {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          33% { transform: translate(-50%, -50%) translateY(-3px); }
          66% { transform: translate(-50%, -50%) translateY(2px); }
        }
      `}</style>
    </div>
  )
}
