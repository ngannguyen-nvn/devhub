import {
  LayoutDashboard,
  Server,
  Container,
  Lock,
  FileText,
  Save,
  GitBranch,
  Activity,
  Plug,
  FileCode,
  ScrollText,
  FolderKanban,
  RotateCcw
} from 'lucide-react'

type ViewType = 'dashboard' | 'services' | 'dependencies' | 'health' | 'ports' | 'templates' | 'logs' | 'groups' | 'restart' | 'workspaces' | 'docker' | 'env' | 'wiki'

interface SidebarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'services' as const, label: 'Services', icon: Server },
    { id: 'dependencies' as const, label: 'Dependencies', icon: GitBranch, badge: 'v2.0' },
    { id: 'health' as const, label: 'Health Checks', icon: Activity, badge: 'v2.0' },
    { id: 'ports' as const, label: 'Port Management', icon: Plug, badge: 'v2.0' },
    { id: 'templates' as const, label: 'Templates', icon: FileCode, badge: 'v2.0' },
    { id: 'logs' as const, label: 'Log Viewer', icon: ScrollText, badge: 'v2.0' },
    { id: 'groups' as const, label: 'Service Groups', icon: FolderKanban, badge: 'v2.0' },
    { id: 'restart' as const, label: 'Auto-Restart', icon: RotateCcw, badge: 'v2.0' },
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

      <nav className="flex-1 p-4 overflow-y-auto">
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
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs font-semibold rounded">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs">DevHub v2.0.0</p>
        <p className="text-gray-500 text-xs mt-1">7 New Features</p>
      </div>
    </div>
  )
}
