import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Services from './components/Services'
import Docker from './components/Docker'
import Sidebar from './components/Sidebar'

function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'services' | 'docker' | 'env' | 'wiki'>('dashboard')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-auto">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'services' && <Services />}
        {activeView === 'docker' && <Docker />}
        {activeView === 'env' && <div className="p-8">Environment (Coming Soon)</div>}
        {activeView === 'wiki' && <div className="p-8">Wiki (Coming Soon)</div>}
      </main>
    </div>
  )
}

export default App
