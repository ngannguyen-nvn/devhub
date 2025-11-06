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
import { vscode, workspaceApi } from './messaging/vscodeApi'
import './styles/App.css'

type TabType = 'dashboard' | 'services' | 'docker' | 'env' | 'workspaces' | 'notes'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>()
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>()
  const [selectedVariableId, setSelectedVariableId] = useState<string | undefined>()
  const [workspaceKey, setWorkspaceKey] = useState<string>('default')

  // Listen for navigation messages from extension host
  useEffect(() => {
    // Signal to extension that webview is ready
    vscode.postMessage({ type: 'webview-ready' })

    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'navigate') {
        const { tab, serviceId, profileId, variableId } = message.payload
        if (tab) {
          setActiveTab(tab as TabType)
        }
        if (serviceId) {
          setSelectedServiceId(serviceId)
        }
        if (profileId) {
          setSelectedProfileId(profileId)
        }
        if (variableId) {
          setSelectedVariableId(variableId)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Listen for workspace changes and update key to force remount
  useEffect(() => {
    const handleWorkspaceChanged = async () => {
      console.log('[App] Workspace changed, fetching active workspace...')
      try {
        const workspace = await workspaceApi.getActive()
        if (workspace) {
          console.log('[App] New active workspace:', workspace.id)
          setWorkspaceKey(workspace.id)
        }
      } catch (err) {
        console.error('[App] Error fetching active workspace:', err)
      }
    }

    // Initial load
    handleWorkspaceChanged()

    // Listen for changes
    window.addEventListener('workspace-changed', handleWorkspaceChanged)
    return () => window.removeEventListener('workspace-changed', handleWorkspaceChanged)
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
        {activeTab === 'dashboard' && <Dashboard key={workspaceKey} />}
        {activeTab === 'services' && <Services key={workspaceKey} initialSelectedServiceId={selectedServiceId} />}
        {activeTab === 'docker' && <Docker key={workspaceKey} />}
        {activeTab === 'env' && <Environment key={workspaceKey} selectedProfileId={selectedProfileId} selectedVariableId={selectedVariableId} onProfileSelected={() => { setSelectedProfileId(undefined); setSelectedVariableId(undefined) }} />}
        {activeTab === 'workspaces' && <Workspaces key={workspaceKey} />}
        {activeTab === 'notes' && <Wiki key={workspaceKey} />}
      </main>
    </div>
  )
}

export default App
