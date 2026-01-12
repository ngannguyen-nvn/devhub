import { useState, useEffect } from 'react'
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
import { ThemeToggle } from './components/ui/ThemeToggle'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

type ViewType = 'dashboard' | 'services' | 'workspaces' | 'docker' | 'env' | 'wiki' | 'database'

function AppContent() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const { theme } = useTheme()

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const shortcuts: Record<string, ViewType> = {
        '1': 'dashboard',
        '2': 'services',
        '3': 'workspaces',
        '4': 'docker',
        '5': 'env',
        '6': 'wiki',
        '7': 'database',
      }

      if (shortcuts[e.key]) {
        setActiveView(shortcuts[e.key])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Dynamic toast styles based on theme
  const toastStyles = theme === 'dark'
    ? {
        style: {
          background: 'hsl(220, 18%, 14%)',
          color: 'hsl(210, 20%, 92%)',
          border: '1px solid hsla(175, 50%, 50%, 0.2)',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 8px 32px -8px hsla(0, 0%, 0%, 0.5)',
        },
        success: {
          iconTheme: {
            primary: 'hsl(145, 80%, 45%)',
            secondary: 'hsl(220, 20%, 6%)',
          },
        },
        error: {
          iconTheme: {
            primary: 'hsl(0, 85%, 60%)',
            secondary: 'hsl(220, 20%, 6%)',
          },
        },
      }
    : {
        style: {
          background: 'hsl(0, 0%, 100%)',
          color: 'hsl(220, 20%, 10%)',
          border: '1px solid hsla(220, 15%, 85%, 0.8)',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 8px 32px -8px hsla(220, 20%, 50%, 0.2)',
        },
        success: {
          iconTheme: {
            primary: 'hsl(145, 70%, 35%)',
            secondary: 'hsl(0, 0%, 100%)',
          },
        },
        error: {
          iconTheme: {
            primary: 'hsl(0, 75%, 50%)',
            secondary: 'hsl(0, 0%, 100%)',
          },
        },
      }

  return (
    <div className="flex h-screen bg-[hsl(var(--background))] overflow-hidden">
      {/* Toast notifications with dynamic styling */}
      <Toaster
        position="top-right"
        toastOptions={toastStyles}
      />

      {/* Sidebar */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Workspace Switcher and Theme Toggle */}
        <header className="sticky top-0 z-10 px-8 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background-elevated))]">
          <div className="flex items-center justify-between">
            <WorkspaceSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* Content with grid pattern background */}
        <div className="flex-1 overflow-auto grid-pattern">
          {/* Ambient glow effect at top */}
          <div
            className="pointer-events-none fixed top-0 left-72 right-0 h-64 opacity-50"
            style={{
              background: theme === 'dark'
                ? 'radial-gradient(ellipse 80% 50% at 50% 0%, hsla(175, 85%, 50%, 0.08) 0%, transparent 100%)'
                : 'radial-gradient(ellipse 80% 50% at 50% 0%, hsla(175, 85%, 50%, 0.04) 0%, transparent 100%)',
            }}
          />

          {/* Page content */}
          <div className="relative p-8 animate-fade-in">
            {activeView === 'dashboard' && <Dashboard onViewChange={setActiveView} />}
            {activeView === 'services' && <Services />}
            {activeView === 'workspaces' && <Workspaces />}
            {activeView === 'docker' && <Docker />}
            {activeView === 'env' && <Environment />}
            {activeView === 'wiki' && <Wiki />}
            {activeView === 'database' && <Database />}
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WorkspaceProvider>
          <AppContent />
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
