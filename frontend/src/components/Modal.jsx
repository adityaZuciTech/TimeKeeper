import { useEffect, useId } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children }) {
  const titleId = useId()

  // ESC to close (heuristic #3 — user control and freedom)
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Panel */}
        <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md z-10 overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 id={titleId} className="text-base font-semibold text-foreground">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
