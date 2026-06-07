import { useEffect, useRef, useState } from 'react'

interface Props {
  starCount: number
  targetStars: number
}

export default function StarJar({ starCount, targetStars }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [shake, setShake] = useState(false)
  const animRef = useRef(0)
  const prevStars = useRef(starCount)

  useEffect(() => {
    if (starCount > prevStars.current) { setShake(true); setTimeout(() => setShake(false), 600) }
    prevStars.current = starCount
  }, [starCount])

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

      const sx = Math.sin(tick * 0.03) * (shake ? 6 : 1)
      ctx.save()
      ctx.translate(sx, 0)

      const jx = w / 2, jy = h * 0.55, jw = w * 0.38, jh = h * 0.6

      // Shadow
      ctx.fillStyle = 'rgba(139,92,246,0.06)'
      ctx.beginPath(); ctx.ellipse(jx + 4, jy + jh * 0.52, jw * 0.48, 6, 0, 0, Math.PI * 2); ctx.fill()

      // Body
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
      ctx.fillStyle = grad; ctx.fill()
      ctx.strokeStyle = 'rgba(139,92,246,0.35)'; ctx.lineWidth = 2.5; ctx.stroke()

      // Rim
      ctx.beginPath()
      ctx.ellipse(jx, jy - jh * 0.48, jw * 0.38, jw * 0.07, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill()
      ctx.strokeStyle = 'rgba(139,92,246,0.4)'; ctx.lineWidth = 2.5; ctx.stroke()

      // Stars inside jar
      if (starCount > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(jx - jw * 0.38, jy - jh * 0.48)
        ctx.lineTo(jx + jw * 0.38, jy - jh * 0.48)
        ctx.lineTo(jx + jw * 0.52, jy + jh * 0.42)
        ctx.quadraticCurveTo(jx + jw * 0.52, jy + jh * 0.5, jx + jw * 0.46, jy + jh * 0.48)
        ctx.lineTo(jx - jw * 0.46, jy + jh * 0.48)
        ctx.quadraticCurveTo(jx - jw * 0.52, jy + jh * 0.5, jx - jw * 0.52, jy + jh * 0.42)
        ctx.closePath(); ctx.clip()

        // Golden glow fill
        const fillRatio = Math.min(starCount / (targetStars || 1), 0.85)
        const fillH = fillRatio * jh * 0.45
        if (fillH > 0) {
          const fg = ctx.createLinearGradient(0, jy + jh * 0.45, 0, jy + jh * 0.45 - fillH)
          fg.addColorStop(0, 'rgba(250,204,21,0.35)')
          fg.addColorStop(0.4, 'rgba(253,224,71,0.5)')
          fg.addColorStop(1, 'rgba(254,240,138,0.65)')
          ctx.fillStyle = fg
          ctx.fillRect(jx - jw * 0.6, jy + jh * 0.48 - fillH, jw * 1.2, fillH + 2)
        }

        // Draw stars
        const displayCount = Math.min(starCount, 50)
        for (let i = 0; i < displayCount; i++) {
          const seed = i * 137.508
          const sx = jx + (Math.sin(seed) * jw * 0.35)
          const sy = (jy + jh * 0.38) - ((i / displayCount) * jh * 0.38) + (Math.cos(seed * 2.3) * 6)
          const sr = 5 + (Math.sin(i * 0.7) * 3)
          const alpha = 0.5 + (i / displayCount) * 0.5
          drawStar(ctx, sx, sy, sr, `rgba(251,191,36,${alpha})`)
        }

        ctx.restore()
      }

      ctx.restore()
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [starCount, targetStars, shake])

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={260} height={320} className="w-64 h-80 mx-auto" />
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
