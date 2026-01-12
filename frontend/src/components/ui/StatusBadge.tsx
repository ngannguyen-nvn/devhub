import { Play, Square, AlertCircle, Clock } from 'lucide-react'

type StatusType = 'running' | 'stopped' | 'error' | 'healthy' | 'unhealthy' | 'unknown' | 'pending'

interface StatusBadgeProps {
  status: StatusType | undefined | null
  variant?: 'dot' | 'badge' | 'pill'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
  pulseColor?: string
  className?: string
}

const statusConfig: Record<StatusType, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof Play | null }> = {
  running: {
    label: 'Running',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Play,
  },
  stopped: {
    label: 'Stopped',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: Square,
  },
  error: {
    label: 'Error',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertCircle,
  },
  healthy: {
    label: 'Healthy',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Play,
  },
  unhealthy: {
    label: 'Unhealthy',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertCircle,
  },
  unknown: {
    label: 'Unknown',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: null,
  },
  pending: {
    label: 'Pending',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock,
  },
}

const sizeConfig = {
  sm: {
    dot: 'w-1.5 h-1.5',
    badge: 'px-1.5 py-0.5 text-xs',
    pill: 'px-2 py-0.5 text-xs',
  },
  md: {
    dot: 'w-2 h-2',
    badge: 'px-2 py-1 text-sm',
    pill: 'px-2.5 py-1 text-sm',
  },
  lg: {
    dot: 'w-2.5 h-2.5',
    badge: 'px-2.5 py-1.5 text-base',
    pill: 'px-3 py-1.5 text-base',
  },
}

function StatusBadge({
  status,
  variant = 'badge',
  size = 'md',
  showLabel = true,
  animated = false,
  pulseColor = 'bg-green-500',
  className = '',
}: StatusBadgeProps) {
  if (!status) {
    return null
  }

  const config = statusConfig[status] || statusConfig.unknown
  const sizes = sizeConfig[size]
  const Icon = config.icon

  if (variant === 'dot') {
    return (
      <span
        className={`inline-flex items-center ${animated ? 'animate-pulse' : ''}`}
        title={config.label}
      >
        <span
          className={`${sizes.dot} rounded-full ${pulseColor}`}
          style={{
            ...(status === 'running' ? {} : {}),
          }}
        />
      </span>
    )
  }

  if (variant === 'pill') {
    return (
      <span
        className={`
          inline-flex items-center gap-1.5 font-medium rounded-full border
          ${config.bgColor} ${config.color} ${config.borderColor}
          ${sizes.pill}
          ${className}
        `}
      >
        {animated && status === 'running' && (
          <span className={`relative flex ${sizes.dot}`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full ${sizes.dot} ${pulseColor}`}></span>
          </span>
        )}
        {!animated && Icon && <Icon size={12} className="flex-shrink-0" />}
        {showLabel && <span>{config.label}</span>}
      </span>
    )
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded border
        ${config.bgColor} ${config.color} ${config.borderColor}
        ${sizes.badge}
        ${className}
      `}
    >
      {animated && status === 'running' && (
        <span className={`relative flex ${sizes.dot}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full ${sizes.dot} ${pulseColor}`}></span>
        </span>
      )}
      {!animated && Icon && <Icon size={12} className="flex-shrink-0" />}
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

export function ServiceStatusBadge({
  status,
  healthStatus,
  className = '',
}: {
  status: 'running' | 'stopped' | 'error' | undefined
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown' | null
  className?: string
}) {
  const isRunning = status === 'running'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <StatusBadge
        status={status || 'stopped'}
        variant="pill"
        size="sm"
        animated={isRunning}
      />
      {isRunning && healthStatus && (
        <StatusBadge
          status={healthStatus === 'healthy' ? 'healthy' : healthStatus === 'unhealthy' ? 'unhealthy' : 'unknown'}
          variant="dot"
          size="sm"
          pulseColor={healthStatus === 'healthy' ? 'bg-green-500' : healthStatus === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'}
        />
      )}
    </div>
  )
}
