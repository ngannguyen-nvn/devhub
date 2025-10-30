import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Dashboard from './components/Dashboard'
import Services from './components/Services'
import Workspaces from './components/Workspaces'
import Docker from './components/Docker'
import Environment from './components/Environment'
import Wiki from './components/Wiki'
import Dependencies from './components/Dependencies'
import HealthChecks from './components/HealthChecks'
import PortManagement from './components/PortManagement'
import Templates from './components/Templates'
import LogViewer from './components/LogViewer'
import ServiceGroups from './components/ServiceGroups'
import AutoRestart from './components/AutoRestart'
import Sidebar from './components/Sidebar'
import WorkspaceSwitcher from './components/WorkspaceSwitcher'
import { WorkspaceProvider } from './contexts/WorkspaceContext'

type ViewType = 'dashboard' | 'services' | 'dependencies' | 'health' | 'ports' | 'templates' | 'logs' | 'groups' | 'restart' | 'workspaces' | 'docker' | 'env' | 'wiki'

function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard')

  return (
    <WorkspaceProvider>
      <div className="flex h-screen bg-gray-50">
        <Toaster position="top-right" />
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 overflow-auto">
          {/* Workspace Switcher Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
            <WorkspaceSwitcher />
          </div>

          {/* Main Content */}
          <div className="p-6">
            {activeView === 'dashboard' && <Dashboard onViewChange={setActiveView} />}
            {activeView === 'services' && <Services />}
            {activeView === 'dependencies' && <Dependencies />}
            {activeView === 'health' && <HealthChecks />}
            {activeView === 'ports' && <PortManagement />}
            {activeView === 'templates' && <Templates />}
            {activeView === 'logs' && <LogViewer />}
            {activeView === 'groups' && <ServiceGroups />}
            {activeView === 'restart' && <AutoRestart />}
            {activeView === 'workspaces' && <Workspaces />}
            {activeView === 'docker' && <Docker />}
            {activeView === 'env' && <Environment />}
            {activeView === 'wiki' && <Wiki />}
          </div>
        </main>
      </div>
    </WorkspaceProvider>
  )
}

export default App
