import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const variantClasses = {
  primary: `
    bg-gradient-to-r from-[hsl(175,85%,45%)] to-[hsl(195,90%,40%)]
    text-[hsl(var(--background))] font-semibold
    shadow-lg shadow-[hsla(175,85%,50%,0.25)]
    hover:shadow-[hsla(175,85%,50%,0.4)] hover:translate-y-[-1px]
    focus:ring-[hsl(var(--primary))] focus:ring-offset-[hsl(var(--background))]
    border border-transparent
  `,
  secondary: `
    bg-[hsl(var(--background-card))]
    text-[hsl(var(--foreground))]
    border border-[hsl(var(--border))]
    hover:bg-[hsl(var(--border))] hover:border-[hsla(175,50%,50%,0.3)]
    focus:ring-[hsl(var(--primary))] focus:ring-offset-[hsl(var(--background))]
  `,
  danger: `
    bg-gradient-to-r from-[hsl(0,85%,55%)] to-[hsl(15,90%,50%)]
    text-white font-semibold
    shadow-lg shadow-[hsla(0,85%,60%,0.25)]
    hover:shadow-[hsla(0,85%,60%,0.4)] hover:translate-y-[-1px]
    focus:ring-[hsl(var(--danger))] focus:ring-offset-[hsl(var(--background))]
    border border-transparent
  `,
  ghost: `
    bg-transparent
    text-[hsl(var(--foreground-muted))]
    hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))]
    focus:ring-[hsl(var(--primary))] focus:ring-offset-[hsl(var(--background))]
    border border-transparent
  `,
  outline: `
    bg-transparent
    text-[hsl(var(--foreground))]
    border border-[hsl(var(--border))]
    hover:bg-[hsla(175,50%,50%,0.1)] hover:border-[hsla(175,85%,50%,0.3)] hover:text-[hsl(var(--primary))]
    focus:ring-[hsl(var(--primary))] focus:ring-offset-[hsl(var(--background))]
  `,
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        active:scale-[0.98]
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : icon && iconPosition === 'left' ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}

      {children}

      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon: ReactNode
  label?: string
}

const iconSizeClasses = {
  sm: 'p-1.5 rounded-lg',
  md: 'p-2 rounded-lg',
  lg: 'p-3 rounded-xl',
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  icon,
  label,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.95]
        ${variantClasses[variant]}
        ${iconSizeClasses[size]}
        ${className}
      `}
      disabled={loading || props.disabled}
      title={label}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <span className="flex-shrink-0">{icon}</span>
      )}
      {label && <span className="sr-only">{label}</span>}
    </button>
  )
}
