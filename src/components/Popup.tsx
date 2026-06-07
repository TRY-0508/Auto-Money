import { useEffect, useRef } from 'react'
import { X } from '@/lib/icons'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function Popup({ open, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler) }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        ref={ref}
        className="relative max-w-xs w-full mx-4 p-5 rounded-2xl
          bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl
          border border-white/60 dark:border-gray-700/50
          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]
          animate-[popIn_0.25s_cubic-bezier(0.34,1.56,0.64,1)]"
      >
        <button onClick={onClose}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center
            rounded-lg bg-black/5 dark:bg-white/5 text-gray-400 hover:text-gray-600
            dark:hover:text-gray-300 transition-colors">
          <X size={13} />
        </button>
        {children}
      </div>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
