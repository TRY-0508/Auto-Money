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
  const [sparkle, setSparkle] = useState(false)
  const fillPercent = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0

  useEffect(() => {
    if (starCount > prevStars) {
      setShake(true); setSparkle(true)
      setTimeout(() => setShake(false), 800)
      setTimeout(() => setSparkle(false), 1500)
    }
    setPrevStars(starCount)
  }, [starCount, prevStars])

  const displayStars = Math.min(starCount, 25)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative select-none ${shake ? 'animate-[bounce_0.6s_ease-out]' : ''}`}>
        {/* Aura on complete */}
        {fillPercent >= 100 && (
          <div className="absolute inset-0 -m-6 rounded-full bg-gradient-radial from-amber-300/30 via-transparent to-transparent animate-pulse" />
        )}

        {/* Jar container */}
        <div className="relative w-36 h-48">

          {/* Golden liquid fill */}
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
            style={{ height: `${Math.max(fillPercent * 0.65, starCount > 0 ? 2 : 0)}%` }}>
            <div className="absolute inset-x-0 bottom-0 rounded-b-[3.5rem] overflow-hidden"
              style={{ height: '100%' }}>
              {/* Main liquid */}
              <div className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(251,191,36,0.55) 0%, rgba(253,224,71,0.45) 40%, rgba(254,240,138,0.3) 75%, rgba(254,240,138,0.1) 100%)',
                }} />
              {/* Liquid surface highlight */}
              <div className="absolute top-0 left-2 right-2 h-1 rounded-full bg-yellow-200/60 blur-[1px]" />
              {/* Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[shimmer_3s_ease-in-out_infinite]"
                style={{ backgroundSize: '200% 100%' }} />
            </div>
          </div>

          {/* Stars */}
          {Array.from({ length: displayStars }).map((_, i) => {
            const x = 15 + (i * 47) % 70
            const yMin = 8 + (fillPercent > 50 ? 45 : fillPercent > 20 ? 30 : 15)
            const y = yMin + ((i * 31) % (75 - yMin))
            const size = 11 + (i % 8)
            const opacity = 0.45 + (i / displayStars) * 0.45
            const delay = i * 0.08
            const dur = 2.8 + (i % 3) * 1.2
            return (
              <div key={i}
                className="absolute"
                style={{
                  left: `${x}%`,
                  bottom: `${y}%`,
                  opacity,
                  animation: `floatSoft ${dur}s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}>
                <svg width={size} height={size} viewBox="0 0 24 24" fill="#fbbf24" filter="url(#glow)">
                  <polygon points="12,1.5 15.3,8.5 23,9.5 17.5,14.5 19,22 12,18 5,22 6.5,14.5 1,9.5 8.7,8.5" />
                </svg>
              </div>
            )
          })}

          {/* Sparkle burst on new star */}
          {sparkle && (
            <div className="absolute inset-0 pointer-events-none">
              {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
                const rad = (a * Math.PI) / 180
                const tx = Math.cos(rad) * 28
                const ty = Math.sin(rad) * 28
                return (
                  <div key={a} className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 animate-[sparkleOut_0.8s_ease-out_forwards]"
                    style={{
                      '--tx': `${tx}px`,
                      '--ty': `${ty}px`,
                      animationDelay: `${Math.random() * 0.12}s`,
                    } as React.CSSProperties} />
                )
              })}
            </div>
          )}

          {/* Glass overlay */}
          <svg viewBox="0 0 160 220" className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <linearGradient id="jarGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(196,167,255,0.15)" />
                <stop offset="30%" stopColor="rgba(196,167,255,0.03)" />
                <stop offset="70%" stopColor="rgba(196,167,255,0.02)" />
                <stop offset="100%" stopColor="rgba(196,167,255,0.12)" />
              </linearGradient>
            </defs>

            {/* Jar body */}
            <path d="M32,62 L28,180 C28,194 132,194 132,180 L128,62"
              fill="url(#jarGrad)" stroke="rgba(167,139,250,0.5)" strokeWidth="2.5"
              strokeLinejoin="round" />

            {/* Jar rim */}
            <ellipse cx="80" cy="62" rx="48" ry="8"
              fill="rgba(196,167,255,0.08)" stroke="rgba(167,139,250,0.5)" strokeWidth="2.5" />

            {/* Lid handle */}
            <path d="M60,54 C60,46 100,46 100,54"
              fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="2.5"
              strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-1">
          <Star size={14} className="text-amber-400" fill="#fbbf24" />
          <span className="font-bold text-amber-500 text-sm">{starCount}</span>
          <span className="text-xs text-muted">星</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted">¥{Math.round(currentAmount)}</span>
          <span className="text-xs text-muted">/</span>
          <span className="text-xs font-medium">¥{Math.round(targetAmount)}</span>
          {fillPercent >= 100 && <span className="text-xs font-bold text-violet-500 bounce-in">达成</span>}
        </div>
        <div className="w-28 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-700 ease-out"
            style={{ width: `${fillPercent}%` }} />
        </div>
      </div>

      <style>{`
        @keyframes floatSoft {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-4px) rotate(2deg); }
          66% { transform: translateY(2px) rotate(-1deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes sparkleOut {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
