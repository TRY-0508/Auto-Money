import { useEffect, useRef } from 'react'

interface Props { stars: number }

export default function StarJar({ stars }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      // Jar body
      const jx = w / 2, jy = h * 0.55, jw = w * 0.4, jh = h * 0.65
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(jx - jw * 0.35, jy - jh * 0.5)
      ctx.lineTo(jx + jw * 0.35, jy - jh * 0.5)
      ctx.lineTo(jx + jw * 0.5, jy + jh * 0.45)
      ctx.quadraticCurveTo(jx + jw * 0.5, jy + jh * 0.52, jx + jw * 0.45, jy + jh * 0.5)
      ctx.lineTo(jx - jw * 0.45, jy + jh * 0.5)
      ctx.quadraticCurveTo(jx - jw * 0.5, jy + jh * 0.52, jx - jw * 0.5, jy + jh * 0.45)
      ctx.closePath()

      // Glass fill effect
      const fillH = Math.min(stars / 20, 1) * jh * 0.45
      const grad = ctx.createLinearGradient(0, jy - jh * 0.5, 0, jy + jh * 0.45)
      grad.addColorStop(0, 'rgba(250, 204, 21, 0.3)')
      grad.addColorStop(1, 'rgba(250, 204, 21, 0.1)')

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Rim
      ctx.beginPath()
      ctx.ellipse(jx, jy - jh * 0.5, jw * 0.35, jw * 0.08, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Fill
      if (fillH > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(jx - jw * 0.35, jy - jh * 0.5)
        ctx.lineTo(jx + jw * 0.35, jy - jh * 0.5)
        ctx.lineTo(jx + jw * 0.5, jy + jh * 0.45)
        ctx.quadraticCurveTo(jx + jw * 0.5, jy + jh * 0.52, jx + jw * 0.45, jy + jh * 0.5)
        ctx.lineTo(jx - jw * 0.45, jy + jh * 0.5)
        ctx.quadraticCurveTo(jx - jw * 0.5, jy + jh * 0.52, jx - jw * 0.5, jy + jh * 0.45)
        ctx.closePath()
        ctx.clip()

        const fg = ctx.createLinearGradient(0, jy + jh * 0.45, 0, jy + jh * 0.45 - fillH)
        fg.addColorStop(0, 'rgba(250, 204, 21, 0.35)')
        fg.addColorStop(1, 'rgba(253, 224, 71, 0.6)')
        ctx.fillStyle = fg
        ctx.fillRect(jx - jw * 0.6, jy + jh * 0.5 - fillH, jw * 1.2, fillH)

        // Stars inside
        for (let i = 0; i < stars; i++) {
          const sx = jx + (Math.sin(i * 2.7) * jw * 0.35)
          const sy = jy + jh * 0.42 - (i * jh * 0.02) - Math.random() * 8
          drawStar(ctx, sx, sy, 4 + Math.random() * 3, '#fbbf24')
        }
        ctx.restore()
      }

      ctx.restore()
    }

    draw()
  }, [stars])

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={240} height={300} className="w-60 h-72" />
      <div className="flex items-center gap-2 mt-2">
        <span className="text-2xl font-bold text-violet-500">{stars}</span>
        <span className="text-sm text-muted">颗星星</span>
      </div>
    </div>
  )
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const spikes = 5; const outer = r; const inner = r * 0.4
  let rot = Math.PI / 2 * 3; const step = Math.PI / spikes
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
  ctx.shadowColor = 'rgba(250, 204, 21, 0.4)'
  ctx.shadowBlur = 6
}
