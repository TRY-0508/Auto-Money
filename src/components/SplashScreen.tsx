import { useState, useEffect, useRef } from 'react'
import { MOOD_LIST, CAT_ICON_OPTIONS } from '@/lib/icons'
import { createRoot } from 'react-dom/client'

interface Props { onEnter: () => void }

export default function SplashScreen({ onEnter }: Props) {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  // Physics-based floating icons
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isMobile = window.innerWidth < 640
    const count = isMobile ? 12 : 24
    const icons = [
      ...MOOD_LIST.slice(0, 8).map(m => ({ Icon: m.Icon, key: m.value })),
      ...CAT_ICON_OPTIONS.slice(0, count).map(c => ({ Icon: c.Icon, key: c.key })),
    ].slice(0, count)

    const items: { el: HTMLDivElement; x: number; y: number; vx: number; vy: number; opacity: number; size: number }[] = []

    for (const icon of icons) {
      const el = document.createElement('div')
      const sz = isMobile ? (22 + Math.random() * 20) : (32 + Math.random() * 28)
      const op = isMobile ? (0.08 + Math.random() * 0.14) : (0.12 + Math.random() * 0.2)
      el.style.cssText = 'position:absolute;pointer-events:none;transition:none;'
      container.appendChild(el)
      const root = createRoot(el)
      root.render(<icon.Icon size={sz} strokeWidth={1.5} color={`rgba(255,255,255,${op})`} />)
      items.push({
        el,
        x: Math.random() * (container.offsetWidth - 40) + 20,
        y: Math.random() * (container.offsetHeight - 40) + 20,
        vx: (Math.random() - 0.5) * (isMobile ? 0.4 : 0.6),
        vy: (Math.random() - 0.5) * (isMobile ? 0.4 : 0.6),
        opacity: op,
        size: sz,
      })
    }

    let id: number
    const MIN_DIST = isMobile ? 50 : 70
    const REPEL = 0.3

    const animate = () => {
      const w = container.offsetWidth
      const h = container.offsetHeight

      for (const item of items) {
        // Move
        item.x += item.vx
        item.y += item.vy

        // Edge bounce
        if (item.x < 10) { item.x = 10; item.vx *= -1 }
        if (item.x > w - 10) { item.x = w - 10; item.vx *= -1 }
        if (item.y < 10) { item.y = 10; item.vy *= -1 }
        if (item.y > h - 10) { item.y = h - 10; item.vy *= -1 }

        item.el.style.left = item.x + 'px'
        item.el.style.top = item.y + 'px'
      }

      // Collision repulsion
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const dx = items[i].x - items[j].x
          const dy = items[i].y - items[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MIN_DIST && dist > 0) {
            const force = (MIN_DIST - dist) / MIN_DIST * REPEL
            const nx = dx / dist; const ny = dy / dist
            items[i].vx += nx * force; items[i].vy += ny * force
            items[j].vx -= nx * force; items[j].vy -= ny * force
            // Cap speed
            const clamp = (v: number) => Math.max(-1.5, Math.min(1.5, v))
            items[i].vx = clamp(items[i].vx); items[i].vy = clamp(items[i].vy)
            items[j].vx = clamp(items[j].vx); items[j].vy = clamp(items[j].vy)
          }
        }
      }

      id = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(id)
      for (const item of items) { item.el.remove() }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 overflow-hidden">
      {/* Physics floating icons container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Background orbs */}
      <div className="absolute w-96 h-96 rounded-full bg-white/10 -top-20 -left-20" style={{ animation: 'float 8s ease-in-out infinite' }} />
      <div className="absolute w-64 h-64 rounded-full bg-white/8 top-1/2 -right-10" style={{ animation: 'float 6s ease-in-out 1s infinite' }} />
      <div className="absolute w-80 h-80 rounded-full bg-white/6 -bottom-20 left-1/4" style={{ animation: 'float 10s ease-in-out 2s infinite' }} />

      {/* Content */}
      <div className={`relative z-10 text-center px-8 transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 shadow-2xl bounce-in">
          <span className="text-5xl">💜</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">心情收支簿</h1>
        <p className="text-white/70 text-sm sm:text-base mb-2 font-medium">记录每一笔 · 感受每一天</p>
        <p className="text-white/50 text-xs max-w-xs mx-auto leading-relaxed">AI 驱动的消费心理助手，帮你看见情绪与金钱的隐秘关联</p>
        <button onClick={onEnter} className="mt-10 px-10 py-4 bg-white text-amber-600 rounded-2xl text-lg font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 halo-pulse">开始使用</button>
        <p className="text-white/30 text-xs mt-6">数据完全存储在本地 · 无需注册</p>
      </div>
    </div>
  )
}
