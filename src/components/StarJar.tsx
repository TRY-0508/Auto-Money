import { useEffect, useState } from 'react'
import { Star } from '@/lib/icons'

interface Props {
  starCount: number
  targetAmount: number
  currentAmount: number
}

export default function StarJar({ starCount, targetAmount, currentAmount }: Props) {
  const [shake, setShake] = useState(false)
  const [prevStars, setPrevStars] = useState(starCount)
  const fillPercent = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0

  useEffect(() => {
    if (starCount > prevStars) { setShake(true); setTimeout(() => setShake(false), 600) }
    setPrevStars(starCount)
  }, [starCount, prevStars])

  const displayStars = Math.min(starCount, 30)

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Jar */}
      <div className={`relative ${shake ? 'animate-[bounce_0.5s_ease-out]' : ''}`}>
        {/* Jar body */}
        <div className="relative w-40 h-52 rounded-b-[4rem] rounded-t-[2.5rem] border-[3px] border-violet-300/60 dark:border-violet-600/40 bg-white/10 dark:bg-gray-900/20 overflow-hidden backdrop-blur-sm shadow-[0_4px_24px_rgba(139,92,246,0.1)]">
          {/* Golden fill */}
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
            style={{ height: `${fillPercent * 0.7}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-amber-300/60 via-yellow-200/50 to-yellow-100/40" />
          </div>

          {/* Stars inside jar */}
          {Array.from({ length: displayStars }).map((_, i) => {
            const angle = (i * 137.508) % 360
            const radius = 10 + (i % 25)
            const bottom = 5 + ((i / displayStars) * 60) + (i % 15)
            const left = 50 + Math.sin(angle * Math.PI / 180) * (30 + (i % 10))
            const size = 10 + (i % 8)
            const alpha = 0.4 + (i / displayStars) * 0.6
            const hue = 40 + (i % 15)
            return (
              <div
                key={i}
                className="absolute transition-all"
                style={{
                  bottom: `${bottom}%`,
                  left: `${left}%`,
                  animation: `float ${2.5 + (i % 2) * 1.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                  opacity: alpha,
                }}
              >
                <svg width={size} height={size} viewBox="0 0 24 24" fill={`hsl(${hue}, 90%, 55%)`} stroke={`hsl(${hue}, 80%, 65%)`} strokeWidth="0.5">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </div>
            )
          })}
        </div>

        {/* Jar rim */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-44 h-7 rounded-full border-[3px] border-violet-300/60 dark:border-violet-600/40 bg-white/20 dark:bg-gray-800/30 backdrop-blur-sm" />

        {/* Lid handle */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 rounded-t-full border-[3px] border-b-0 border-violet-300/60 dark:border-violet-600/40" />
      </div>

      {/* Stats */}
      <div className="text-center space-y-0.5">
        <div className="flex items-center justify-center gap-1.5">
          <Star size={16} className="text-amber-400" fill="#fbbf24" />
          <span className="font-bold text-amber-500">{starCount}</span>
          <span className="text-xs text-muted">颗星星</span>
        </div>
        <p className="text-xs text-muted">
          已攒 ¥{currentAmount.toFixed(0)} / ¥{targetAmount.toFixed(0)}
          {fillPercent >= 100 && <span className="ml-1 font-bold text-violet-600 bounce-in">目标达成!</span>}
        </p>
        {/* Mini progress bar */}
        <div className="w-32 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" style={{ width: `${fillPercent}%` }} />
        </div>
      </div>
    </div>
  )
}
