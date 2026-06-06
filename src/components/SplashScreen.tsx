import { useState, useEffect } from 'react'
import { MOOD_LIST, CAT_ICON_OPTIONS } from '@/lib/icons'

interface Props {
  onEnter: () => void
}

export default function SplashScreen({ onEnter }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0">
        <div className="absolute w-96 h-96 rounded-full bg-white/10 -top-20 -left-20 animate-[float_8s_ease-in-out_infinite]" />
        <div className="absolute w-64 h-64 rounded-full bg-white/8 top-1/2 -right-10 animate-[float_6s_ease-in-out_infinite_1s]" />
        <div className="absolute w-80 h-80 rounded-full bg-white/6 -bottom-20 left-1/4 animate-[float_10s_ease-in-out_infinite_2s]" />
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          ...MOOD_LIST.map(m => ({ Icon: m.Icon, key: m.value })),
          ...CAT_ICON_OPTIONS.map(c => ({ Icon: c.Icon, key: c.key })),
        ].map((item, i) => {
          const Icon = item.Icon
          const x = 5 + (i * 7.3) % 90
          const y = 3 + (i * 8.7) % 88
          const delay = i * 0.35
          const sz = 18 + (i % 4) * 12
          return (
            <div key={item.key + i} className="absolute opacity-12"
              style={{ left: `${x}%`, top: `${y}%`, animation: `float ${5 + (i % 4)}s ease-in-out ${delay}s infinite` }}>
              <Icon size={sz} strokeWidth={1.5} color="#fff" />
            </div>
          )
        })}
      </div>

      {/* Content */}
      <div className={`relative z-10 text-center px-8 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* App icon */}
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 shadow-2xl bounce-in">
          <span className="text-5xl">💜</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">
          心情收支簿
        </h1>
        <p className="text-white/70 text-sm sm:text-base mb-2 font-medium">
          记录每一笔 · 感受每一天
        </p>
        <p className="text-white/50 text-xs max-w-xs mx-auto leading-relaxed">
          AI 驱动的消费心理助手，帮你看见情绪与金钱的隐秘关联
        </p>

        {/* Enter button */}
        <button
          onClick={onEnter}
          className="mt-10 px-10 py-4 bg-white text-violet-600 rounded-2xl text-lg font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 halo-pulse"
        >
          开始使用
        </button>

        <p className="text-white/30 text-xs mt-6">
          数据完全存储在本地 · 无需注册
        </p>
      </div>
    </div>
  )
}
