import {
  LayoutDashboard,
  Server,
  Container,
  Lock,
  FileText,
  Save,
  Database,
  Zap,
  Activity
} from 'lucide-react'
import packageJson from '../../../package.json'

type ViewType = 'dashboard' | 'services' | 'workspaces' | 'docker' | 'env' | 'wiki' | 'database'

interface SidebarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, shortcut: '1' },
    { id: 'services' as const, label: 'Services', icon: Server, shortcut: '2' },
    { id: 'workspaces' as const, label: 'Workspaces', icon: Save, shortcut: '3' },
    { id: 'docker' as const, label: 'Docker', icon: Container, shortcut: '4' },
    { id: 'env' as const, label: 'Environment', icon: Lock, shortcut: '5' },
    { id: 'wiki' as const, label: 'Wiki', icon: FileText, shortcut: '6' },
    { id: 'database' as const, label: 'Database', icon: Database, shortcut: '7' },
  ]

  return (
    <div className="w-72 flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--background))]">
      {/* Logo Section */}
      <div className="p-6 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(175,85%,50%)] to-[hsl(195,90%,45%)] flex items-center justify-center shadow-lg shadow-[hsla(175,85%,50%,0.3)]">
              <Zap size={22} className="text-[hsl(var(--background))]" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[hsl(var(--success))] border-2 border-[hsl(var(--background))]">
              <span className="absolute inset-0 rounded-full bg-[hsl(var(--success))] animate-ping opacity-75" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold terminal-text text-gradient">DevHub</h1>
            <p className="text-xs text-[hsl(var(--foreground-muted))] tracking-wider uppercase">Mission Control</p>
          </div>
        </div>
      </div>

      {/* System Status Indicator */}
      <div className="px-6 py-4 border-b border-[hsl(var(--border))]">
        <div className="glass-card rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[hsl(var(--success))]" />
            <span className="text-xs text-[hsl(var(--foreground-muted))] uppercase tracking-wider">System Online</span>
          </div>
          <div className="mt-2 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full bg-[hsl(var(--success))] opacity-80"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <p className="px-4 mb-3 text-xs font-medium text-[hsl(var(--foreground-muted))] uppercase tracking-wider">
          Navigation
        </p>
        <div className="space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <button
                key={item.id}
                data-testid={`nav-${item.id}`}
                onClick={() => onViewChange(item.id)}
                className={`
                  nav-item w-full mb-1 animate-fade-in
                  ${isActive ? 'active' : ''}
                `}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Icon size={18} className={isActive ? 'text-[hsl(var(--primary))]' : ''} />
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                <span className={`
                  text-xs px-1.5 py-0.5 rounded font-mono
                  ${isActive
                    ? 'bg-[hsla(175,85%,50%,0.2)] text-[hsl(var(--primary))]'
                    : 'bg-[hsl(var(--border))] text-[hsl(var(--foreground-muted))]'
                  }
                `}>
                  {item.shortcut}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[hsl(var(--border))]">
        <div className="glass-card rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-[hsl(var(--primary))]">v{packageJson.version}</p>
              <p className="text-xs text-[hsl(var(--foreground-muted))] mt-0.5">Production Ready</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--border))] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
