import { useEffect, useCallback } from 'react'

const COLORS = ['#f59e0b','#fb923c','#f472b6','#14b8a6','#10b981','#ef4444','#eab308','#d97706']
const PARTICLE_COUNT = 8

export default function ParticleEffect() {
  const spawn = useCallback((x: number, y: number) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const dot = document.createElement('div')
      const size = 4 + Math.random() * 6
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5
      const dist = 20 + Math.random() * 40
      const dx = Math.cos(angle) * dist
      const dy = Math.sin(angle) * dist

      dot.style.cssText = `
        position: fixed; left: ${x}px; top: ${y}px;
        width: ${size}px; height: ${size}px;
        border-radius: 50%;
        background: ${COLORS[i % COLORS.length]};
        pointer-events: none; z-index: 9999;
        opacity: 1;
        transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      `
      document.body.appendChild(dot)

      // Trigger animation
      requestAnimationFrame(() => {
        dot.style.transform = `translate(${dx}px, ${dy}px) scale(0)`
        dot.style.opacity = '0'
      })

      // Cleanup
      setTimeout(() => dot.remove(), 650)
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Don't spawn on button clicks or form inputs (they have their own feedback)
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('input') || target.closest('select')) return
      spawn(e.clientX, e.clientY)
    }

    const touchHandler = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('input') || target.closest('select')) return
      const touch = e.touches[0]
      if (touch) spawn(touch.clientX, touch.clientY)
    }

    document.addEventListener('click', handler)
    document.addEventListener('touchstart', touchHandler, { passive: true })
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('touchstart', touchHandler)
    }
  }, [spawn])

  return null
}
