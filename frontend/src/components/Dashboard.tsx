import { useEffect, useState } from 'react'
import { GitBranch, RefreshCw, Folder, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { SkeletonLoader } from './Loading'

interface Repository {
  name: string
  path: string
  branch: string
  hasChanges: boolean
  lastCommit: {
    message: string
    date: string
    author: string
  }
  hasDockerfile: boolean
}

export default function Dashboard() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanPath, setScanPath] = useState('/home/user')

  const scanRepositories = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/repos/scan?path=${encodeURIComponent(scanPath)}`)
      setRepos(response.data.repositories)
    } catch (err) {
      setError('Failed to scan repositories')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    scanRepositories()
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Repository Dashboard</h1>
        <p className="text-gray-600">Manage all your git repositories in one place</p>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          value={scanPath}
          onChange={(e) => setScanPath(e.target.value)}
          placeholder="Path to scan (e.g., /home/user)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={scanRepositories}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading && repos.length === 0 && (
        <SkeletonLoader count={3} />
      )}

      {repos.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-500">
          <Folder size={48} className="mx-auto mb-4 text-gray-400" />
          <p>No repositories found. Try scanning a different path.</p>
        </div>
      )}

      <div className="grid gap-4">
        {repos.map((repo) => (
          <div
            key={repo.path}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{repo.name}</h3>
                <p className="text-sm text-gray-500 font-mono">{repo.path}</p>
              </div>
              {repo.hasDockerfile && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  Docker
                </span>
              )}
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-gray-400" />
                <span className="font-medium">{repo.branch}</span>
              </div>

              {repo.hasChanges && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                  Uncommitted changes
                </span>
              )}
            </div>

            {repo.lastCommit && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-700 mb-1">{repo.lastCommit.message}</p>
                <p className="text-xs text-gray-500">
                  {repo.lastCommit.author} • {new Date(repo.lastCommit.date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
