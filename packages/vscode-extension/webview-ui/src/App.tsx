/**
 * DevHub Webview App
 *
 * Main application component for VSCode extension webview.
 */

import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Services from './components/Services'
import './styles/App.css'

type TabType = 'dashboard' | 'services' | 'docker' | 'env' | 'workspaces' | 'notes'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 DevHub</h1>
        <p className="subtitle">Developer Mission Control</p>
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
        {activeTab === 'services' && <Services />}
        {activeTab === 'docker' && (
          <div className="placeholder">
            <h2>🐳 Docker Management</h2>
            <p>Coming soon in Phase 3</p>
          </div>
        )}
        {activeTab === 'env' && (
          <div className="placeholder">
            <h2>⚙️ Environment Variables</h2>
            <p>Coming soon in Phase 4</p>
          </div>
        )}
        {activeTab === 'workspaces' && (
          <div className="placeholder">
            <h2>📁 Workspaces & Snapshots</h2>
            <p>Coming soon in Phase 5</p>
          </div>
        )}
        {activeTab === 'notes' && (
          <div className="placeholder">
            <h2>📝 Notes & Wiki</h2>
            <p>Coming soon in Phase 6</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
