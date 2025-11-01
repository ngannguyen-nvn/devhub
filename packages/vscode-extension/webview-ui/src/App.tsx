/**
 * DevHub Webview App
 *
 * Main application component for VSCode extension webview.
 */

import { useState } from 'react'
import Services from './components/Services'
import './styles/App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'services' | 'docker' | 'workspaces' | 'notes'>('services')

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 DevHub</h1>
        <p className="subtitle">Developer Mission Control</p>
      </header>

      <nav className="tabs">
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
        {activeTab === 'services' && <Services />}
        {activeTab === 'docker' && (
          <div className="placeholder">
            <h2>🐳 Docker Management</h2>
            <p>Coming soon in Phase 3</p>
          </div>
        )}
        {activeTab === 'workspaces' && (
          <div className="placeholder">
            <h2>📁 Workspaces</h2>
            <p>Coming soon in Phase 3</p>
          </div>
        )}
        {activeTab === 'notes' && (
          <div className="placeholder">
            <h2>📝 Notes & Wiki</h2>
            <p>Coming soon in Phase 3</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
