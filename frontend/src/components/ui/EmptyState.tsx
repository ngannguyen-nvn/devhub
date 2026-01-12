import { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

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
        ${fullHeight ? 'flex-1 min-h-[400px]' : 'py-12 px-4'}
        ${className}
      `}
    >
      {loading ? (
        <RefreshCw size={48} className="mb-4 text-gray-400 animate-spin" />
      ) : icon ? (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      ) : null}

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {loading ? 'Loading...' : title}
      </h3>

      {description && (
        <p className="text-gray-600 max-w-sm mb-4">
          {description}
        </p>
      )}

      {!loading && (action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <button
              onClick={action.onClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              {action.icon}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
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
