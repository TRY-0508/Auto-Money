import { useEffect, useRef } from 'react'
import { X } from '@/lib/icons'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export default function Popup({ open, onClose, children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use mousedown to avoid issues with clicks that trigger state changes before bubble
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler) }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        ref={ref}
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 max-w-xs w-full mx-4 slide-up ${className}`}
      >
        <button onClick={onClose} className="absolute top-3 right-3 btn-icon">
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  )
}
