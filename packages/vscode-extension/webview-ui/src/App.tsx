/**
 * DevHub Webview App
 *
 * Main application component for VSCode extension webview.
 */

import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Services from './components/Services'
import Docker from './components/Docker'
import Environment from './components/Environment'
import Workspaces from './components/Workspaces'
import Wiki from './components/Wiki'
import WorkspaceSwitcher from './components/WorkspaceSwitcher'
import './styles/App.css'

type TabType = 'dashboard' | 'services' | 'docker' | 'env' | 'workspaces' | 'notes'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>()

  // Listen for navigation messages from extension host
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'navigate') {
        const { tab, serviceId } = message.payload
        if (tab) {
          setActiveTab(tab as TabType)
        }
        if (serviceId) {
          setSelectedServiceId(serviceId)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>🚀 DevHub</h1>
          <p className="subtitle">Developer Mission Control</p>
        </div>
        <div className="header-right">
          <WorkspaceSwitcher />
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          Services
        </button>
        <button
          className={`tab ${activeTab === 'docker' ? 'active' : ''}`}
          onClick={() => setActiveTab('docker')}
        >
          Docker
        </button>
        <button
          className={`tab ${activeTab === 'env' ? 'active' : ''}`}
          onClick={() => setActiveTab('env')}
        >
          Environment
        </button>
        <button
          className={`tab ${activeTab === 'workspaces' ? 'active' : ''}`}
          onClick={() => setActiveTab('workspaces')}
        >
          Workspaces
        </button>
        <button
          className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
      </nav>

      <main className="app-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'services' && <Services initialSelectedServiceId={selectedServiceId} />}
        {activeTab === 'docker' && <Docker />}
        {activeTab === 'env' && <Environment />}
        {activeTab === 'workspaces' && <Workspaces />}
        {activeTab === 'notes' && <Wiki />}
      </main>
    </div>
  )
}

export default App
