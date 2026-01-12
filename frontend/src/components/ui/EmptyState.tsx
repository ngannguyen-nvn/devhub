import { ReactNode } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  loading?: boolean
  className?: string
  fullHeight?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  loading = false,
  className = '',
  fullHeight = false,
}: EmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${fullHeight ? 'flex-1 min-h-[400px]' : 'py-16 px-4'}
        ${className}
      `}
    >
      {/* Decorative background */}
      <div className="relative">
        {loading ? (
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--border))] flex items-center justify-center mb-6">
              <RefreshCw size={28} className="text-[hsl(var(--primary))] animate-spin" />
            </div>
            <div
              className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ background: 'hsl(var(--primary))' }}
            />
          </div>
        ) : icon ? (
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center">
              <div className="text-[hsl(var(--foreground-muted))]">
                {icon}
              </div>
            </div>
            {/* Decorative sparkle */}
            <Sparkles
              size={16}
              className="absolute -top-1 -right-1 text-[hsl(var(--primary))] animate-pulse"
            />
          </div>
        ) : null}
      </div>

      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
        {loading ? 'Loading...' : title}
      </h3>

      {description && (
        <p className="text-[hsl(var(--foreground-muted))] max-w-sm mb-6 text-sm leading-relaxed">
          {description}
        </p>
      )}

      {!loading && (action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="btn-glow px-5 py-2.5 text-[hsl(var(--background))] rounded-xl font-medium flex items-center gap-2 transition-all"
            >
              {action.icon}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-[hsl(var(--primary))] hover:bg-[hsla(var(--primary),0.1)] rounded-xl transition-colors font-medium"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface EmptyServicesProps {
  onAddService?: () => void
  onImportFromWorkspace?: () => void
  className?: string
}

export function EmptyServices({
  onAddService,
  onImportFromWorkspace,
  className = '',
}: EmptyServicesProps) {
  return (
    <EmptyState
      title="No services defined yet"
      description="Add your first service to start managing your microservices"
      className={className}
      action={onAddService ? {
        label: 'Add Service',
        onClick: onAddService,
      } : undefined}
      secondaryAction={onImportFromWorkspace ? {
        label: 'Import from Workspace',
        onClick: onImportFromWorkspace,
      } : undefined}
    />
  )
}
