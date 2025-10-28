import { LayoutDashboard, Server, Container, Lock, FileText, Save } from 'lucide-react'

interface SidebarProps {
  activeView: 'dashboard' | 'services' | 'workspaces' | 'docker' | 'env' | 'wiki'
  onViewChange: (view: 'dashboard' | 'services' | 'workspaces' | 'docker' | 'env' | 'wiki') => void
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'services' as const, label: 'Services', icon: Server },
    { id: 'workspaces' as const, label: 'Workspaces', icon: Save },
    { id: 'docker' as const, label: 'Docker', icon: Container },
    { id: 'env' as const, label: 'Environment', icon: Lock },
    { id: 'wiki' as const, label: 'Wiki', icon: FileText },
  ]

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">DevHub</h1>
        <p className="text-gray-400 text-sm mt-1">Mission Control</p>
      </div>

      <nav className="flex-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs">DevHub v0.1.0-alpha</p>
      </div>
    </div>
  )
}
