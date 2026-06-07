import { useEffect, useRef, useState } from 'react'

const SPARKLE_COLORS = ['#fbbf24','#f59e0b','#fef3c7','#fde68a','#eab308']

interface Props {
  stars: number
  target?: number
  addingStars?: number
}

export default function StarJar({ stars, target, addingStars = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [shake, setShake] = useState(false)
  const animRef = useRef(0)
  const prevStars = useRef(stars)

  useEffect(() => {
    if (stars > prevStars.current) {
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
    prevStars.current = stars
  }, [stars])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height

    let tick = 0

    const draw = () => {
      tick++
      ctx.clearRect(0, 0, w, h)

      const sx = (Math.sin(tick * 0.03) * (shake ? 6 : 1))
      ctx.save()
      ctx.translate(sx, 0)

      const jx = w / 2, jy = h * 0.58, jw = w * 0.38, jh = h * 0.6

      // Jar shadow
      ctx.fillStyle = 'rgba(139,92,246,0.06)'
      ctx.beginPath()
      ctx.ellipse(jx + 4, jy + jh * 0.52, jw * 0.48, 6, 0, 0, Math.PI * 2)
      ctx.fill()

      // Jar body
      ctx.beginPath()
      ctx.moveTo(jx - jw * 0.38, jy - jh * 0.48)
      ctx.lineTo(jx + jw * 0.38, jy - jh * 0.48)
      ctx.lineTo(jx + jw * 0.52, jy + jh * 0.42)
      ctx.quadraticCurveTo(jx + jw * 0.52, jy + jh * 0.5, jx + jw * 0.46, jy + jh * 0.48)
      ctx.lineTo(jx - jw * 0.46, jy + jh * 0.48)
      ctx.quadraticCurveTo(jx - jw * 0.52, jy + jh * 0.5, jx - jw * 0.52, jy + jh * 0.42)
      ctx.closePath()

      const grad = ctx.createLinearGradient(0, 0, w * 0.3, h * 0.3)
      grad.addColorStop(0, 'rgba(255,255,255,0.25)')
      grad.addColorStop(0.5, 'rgba(255,255,255,0.05)')
      grad.addColorStop(1, 'rgba(255,255,255,0.03)')
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = 'rgba(139,92,246,0.35)'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Rim
      ctx.beginPath()
      ctx.ellipse(jx, jy - jh * 0.48, jw * 0.38, jw * 0.07, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(139,92,246,0.4)'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Star fill
      const totalStars = stars + addingStars
      if (totalStars > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(jx - jw * 0.38, jy - jh * 0.48)
        ctx.lineTo(jx + jw * 0.38, jy - jh * 0.48)
        ctx.lineTo(jx + jw * 0.52, jy + jh * 0.42)
        ctx.quadraticCurveTo(jx + jw * 0.52, jy + jh * 0.5, jx + jw * 0.46, jy + jh * 0.48)
        ctx.lineTo(jx - jw * 0.46, jy + jh * 0.48)
        ctx.quadraticCurveTo(jx - jw * 0.52, jy + jh * 0.5, jx - jw * 0.52, jy + jh * 0.42)
        ctx.closePath()
        ctx.clip()

        // Golden liquid fill
        const fillH = Math.min(totalStars / 25, 0.85) * jh * 0.45
        const fg = ctx.createLinearGradient(0, jy + jh * 0.45, 0, jy + jh * 0.45 - fillH)
        fg.addColorStop(0, 'rgba(250,204,21,0.35)')
        fg.addColorStop(0.4, 'rgba(253,224,71,0.5)')
        fg.addColorStop(1, 'rgba(254,240,138,0.65)')
        ctx.fillStyle = fg
        ctx.fillRect(jx - jw * 0.6, jy + jh * 0.48 - fillH, jw * 1.2, fillH + 2)

        // Stars inside
        for (let i = 0; i < totalStars; i++) {
          const sx = jx + (Math.sin(i * 2.7 + tick * 0.01) * jw * 0.32)
          const sy = jy + jh * 0.4 - (i * jh * 0.017) - (addingStars > 0 && i >= stars ? Math.sin(tick * 0.15 + i) * 10 : 0)
          const clr = SPARKLE_COLORS[i % SPARKLE_COLORS.length]
          drawStar(ctx, sx, sy, 3.5 + Math.random() * 2.5, clr)
        }

        ctx.restore()
      }

      ctx.restore()

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [stars, addingStars, shake])

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={260} height={320} className="w-64 h-80" />
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xl font-bold text-violet-500">{stars}</span>
        <span className="text-sm text-muted">颗星星</span>
        {target && <span className="text-sm text-muted">/ {target}</span>}
      </div>
      {target && stars >= target && (
        <p className="text-sm font-bold text-violet-600 mt-1 bounce-in">目标达成!</p>
      )}
    </div>
  )
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const spikes = 5, outer = r, inner = r * 0.35
  let rot = Math.PI / 2 * 3
  const step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(x, y - outer)
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(x + Math.cos(rot) * outer, y + Math.sin(rot) * outer)
    rot += step
    ctx.lineTo(x + Math.cos(rot) * inner, y + Math.sin(rot) * inner)
    rot += step
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}
