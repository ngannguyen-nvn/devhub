import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2.5 rounded-xl transition-all duration-300
        bg-[hsl(var(--border))] hover:bg-[hsla(var(--primary),0.15)]
        focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]
        ${className}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon - visible in dark mode */}
        <Sun
          size={20}
          className={`
            absolute inset-0 transition-all duration-300
            ${isDark
              ? 'text-[hsl(var(--warning))] rotate-0 scale-100 opacity-100'
              : 'text-[hsl(var(--warning))] -rotate-90 scale-0 opacity-0'
            }
          `}
        />
        {/* Moon icon - visible in light mode */}
        <Moon
          size={20}
          className={`
            absolute inset-0 transition-all duration-300
            ${isDark
              ? 'text-[hsl(var(--primary))] rotate-90 scale-0 opacity-0'
              : 'text-[hsl(var(--primary))] rotate-0 scale-100 opacity-100'
            }
          `}
        />
      </div>
    </button>
  )
}
