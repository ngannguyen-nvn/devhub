import { Play, Square, AlertCircle, Clock, CheckCircle, XCircle, HelpCircle } from 'lucide-react'

type StatusType = 'running' | 'stopped' | 'error' | 'healthy' | 'unhealthy' | 'unknown' | 'pending'

interface StatusBadgeProps {
  status: StatusType | undefined | null
  variant?: 'dot' | 'badge' | 'pill'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
  className?: string
}

const statusConfig: Record<StatusType, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  glowColor: string
  dotColor: string
  icon: typeof Play | null
}> = {
  running: {
    label: 'Running',
    color: 'text-[hsl(var(--success))]',
    bgColor: 'bg-[hsla(var(--success),0.15)]',
    borderColor: 'border-[hsla(var(--success),0.3)]',
    glowColor: 'shadow-[0_0_12px_-2px_hsla(var(--success),0.5)]',
    dotColor: 'bg-[hsl(var(--success))]',
    icon: Play,
  },
  stopped: {
    label: 'Stopped',
    color: 'text-[hsl(var(--foreground-muted))]',
    bgColor: 'bg-[hsl(var(--border))]',
    borderColor: 'border-[hsl(var(--border))]',
    glowColor: '',
    dotColor: 'bg-[hsl(var(--foreground-muted))]',
    icon: Square,
  },
  error: {
    label: 'Error',
    color: 'text-[hsl(var(--danger))]',
    bgColor: 'bg-[hsla(var(--danger),0.15)]',
    borderColor: 'border-[hsla(var(--danger),0.3)]',
    glowColor: 'shadow-[0_0_12px_-2px_hsla(var(--danger),0.5)]',
    dotColor: 'bg-[hsl(var(--danger))]',
    icon: XCircle,
  },
  healthy: {
    label: 'Healthy',
    color: 'text-[hsl(var(--success))]',
    bgColor: 'bg-[hsla(var(--success),0.15)]',
    borderColor: 'border-[hsla(var(--success),0.3)]',
    glowColor: 'shadow-[0_0_12px_-2px_hsla(var(--success),0.5)]',
    dotColor: 'bg-[hsl(var(--success))]',
    icon: CheckCircle,
  },
  unhealthy: {
    label: 'Unhealthy',
    color: 'text-[hsl(var(--danger))]',
    bgColor: 'bg-[hsla(var(--danger),0.15)]',
    borderColor: 'border-[hsla(var(--danger),0.3)]',
    glowColor: 'shadow-[0_0_12px_-2px_hsla(var(--danger),0.5)]',
    dotColor: 'bg-[hsl(var(--danger))]',
    icon: AlertCircle,
  },
  unknown: {
    label: 'Unknown',
    color: 'text-[hsl(var(--foreground-muted))]',
    bgColor: 'bg-[hsl(var(--border))]',
    borderColor: 'border-[hsl(var(--border))]',
    glowColor: '',
    dotColor: 'bg-[hsl(var(--foreground-muted))]',
    icon: HelpCircle,
  },
  pending: {
    label: 'Pending',
    color: 'text-[hsl(var(--warning))]',
    bgColor: 'bg-[hsla(var(--warning),0.15)]',
    borderColor: 'border-[hsla(var(--warning),0.3)]',
    glowColor: 'shadow-[0_0_12px_-2px_hsla(var(--warning),0.5)]',
    dotColor: 'bg-[hsl(var(--warning))]',
    icon: Clock,
  },
}

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    badge: 'px-2 py-0.5 text-xs gap-1',
    pill: 'px-2.5 py-0.5 text-xs gap-1.5',
    icon: 10,
  },
  md: {
    dot: 'w-2.5 h-2.5',
    badge: 'px-2.5 py-1 text-xs gap-1.5',
    pill: 'px-3 py-1 text-sm gap-1.5',
    icon: 12,
  },
  lg: {
    dot: 'w-3 h-3',
    badge: 'px-3 py-1.5 text-sm gap-2',
    pill: 'px-4 py-1.5 text-sm gap-2',
    icon: 14,
  },
}

function StatusBadge({
  status,
  variant = 'badge',
  size = 'md',
  showLabel = true,
  animated = false,
  className = '',
}: StatusBadgeProps) {
  if (!status) {
    return null
  }

  const config = statusConfig[status] || statusConfig.unknown
  const sizes = sizeConfig[size]
  const Icon = config.icon
  const isActive = status === 'running' || status === 'healthy'

  if (variant === 'dot') {
    return (
      <span
        className={`relative inline-flex ${className}`}
        title={config.label}
      >
        <span
          className={`
            ${sizes.dot} rounded-full
            ${config.dotColor}
            ${animated && isActive ? '' : ''}
          `}
        />
        {animated && isActive && (
          <span
            className={`
              absolute inset-0 ${sizes.dot} rounded-full
              ${config.dotColor}
              animate-ping opacity-75
            `}
          />
        )}
      </span>
    )
  }

  if (variant === 'pill') {
    return (
      <span
        className={`
          inline-flex items-center font-medium rounded-full border
          ${config.bgColor} ${config.color} ${config.borderColor}
          ${animated && isActive ? config.glowColor : ''}
          ${sizes.pill}
          ${className}
        `}
      >
        {animated && isActive && (
          <span className="relative flex h-2 w-2 mr-0.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
          </span>
        )}
        {!animated && Icon && <Icon size={sizes.icon} className="flex-shrink-0" />}
        {showLabel && <span>{config.label}</span>}
      </span>
    )
  }

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-lg border
        ${config.bgColor} ${config.color} ${config.borderColor}
        ${animated && isActive ? config.glowColor : ''}
        ${sizes.badge}
        ${className}
      `}
    >
      {animated && isActive && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
        </span>
      )}
      {!animated && Icon && <Icon size={sizes.icon} className="flex-shrink-0" />}
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
          animated
        />
      )}
    </div>
  )
}
