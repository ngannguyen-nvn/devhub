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
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
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
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className={`${style.iconBg} p-3 rounded-full`}>
              <Icon className={`${style.iconColor} w-6 h-6`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${style.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
