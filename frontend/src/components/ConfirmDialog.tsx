import { AlertTriangle, Info, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  children?: React.ReactNode
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  children,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconColor: 'text-[hsl(var(--danger))]',
      iconBg: 'bg-[hsla(var(--danger),0.15)]',
      button: 'bg-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-glow))] text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-[hsl(var(--warning))]',
      iconBg: 'bg-[hsla(var(--warning),0.15)]',
      button: 'bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning-glow))] text-[hsl(var(--background))]',
    },
    info: {
      icon: Info,
      iconColor: 'text-[hsl(var(--info))]',
      iconBg: 'bg-[hsla(var(--info),0.15)]',
      button: 'bg-[hsl(var(--info))] hover:bg-[hsl(var(--info-glow))] text-white',
    },
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[hsla(220,20%,4%,0.8)] backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="glass-card rounded-2xl shadow-xl max-w-md w-full mx-4 animate-slide-up overflow-hidden">
        {/* Top glow accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, hsla(175, 85%, 50%, 0.5), transparent)',
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className={`${style.iconBg} p-3 rounded-xl`}>
              <Icon className={`${style.iconColor} w-6 h-6`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">{title}</h3>
              <p className="text-sm text-[hsl(var(--foreground-muted))]">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors p-1 hover:bg-[hsl(var(--border))] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Children (optional extra content) */}
        {children && (
          <div className="px-6 pb-4">
            {children}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[hsl(var(--border))] rounded-xl hover:bg-[hsl(var(--background-elevated))] text-[hsl(var(--foreground))] font-medium transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${style.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
