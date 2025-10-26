import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Services from './components/Services'
import Workspaces from './components/Workspaces'
import Docker from './components/Docker'
import Environment from './components/Environment'
import Wiki from './components/Wiki'
import Sidebar from './components/Sidebar'

function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'services' | 'workspaces' | 'docker' | 'env' | 'wiki'>('dashboard')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-auto">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'services' && <Services />}
        {activeView === 'workspaces' && <Workspaces />}
        {activeView === 'docker' && <Docker />}
        {activeView === 'env' && <Environment />}
        {activeView === 'wiki' && <Wiki />}
      </main>
    </div>
  )
}

export default App
