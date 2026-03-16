import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        {/* Panel */}
        <div className="relative bg-card rounded-lg border border-border shadow-xl w-full max-w-md z-10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-base font-heading font-semibold text-foreground">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
