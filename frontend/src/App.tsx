import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Dashboard from './components/Dashboard'
import Services from './components/Services'
import Workspaces from './components/Workspaces'
import Docker from './components/Docker'
import Environment from './components/Environment'
import Wiki from './components/Wiki'
import Database from './components/Database'
import Sidebar from './components/Sidebar'
import WorkspaceSwitcher from './components/WorkspaceSwitcher'
import ErrorBoundary from './components/ErrorBoundary'
import { WorkspaceProvider } from './contexts/WorkspaceContext'

type ViewType = 'dashboard' | 'services' | 'workspaces' | 'docker' | 'env' | 'wiki' | 'database'

function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard')

  return (
    <ErrorBoundary>
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
              {activeView === 'workspaces' && <Workspaces />}
              {activeView === 'docker' && <Docker />}
              {activeView === 'env' && <Environment />}
              {activeView === 'wiki' && <Wiki />}
              {activeView === 'database' && <Database />}
            </div>
          </main>
        </div>
      </WorkspaceProvider>
    </ErrorBoundary>
  )
}

export default App
