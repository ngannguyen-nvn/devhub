import { useState, useEffect } from 'react'
import { GitBranch, Trash2, RotateCcw, Archive, RefreshCw, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

interface Stash {
  index: number
  hash: string
  message: string
  date: string
}

interface StashFile {
  file: string
  insertions: number
  deletions: number
  changes: number
  isUntracked?: boolean
}

interface StashDetails {
  files: StashFile[]
  summary: {
    totalFiles: number
    totalInsertions: number
    totalDeletions: number
    untrackedFiles: number
  }
}

interface StashManagerProps {
  repoPaths: string[]
  onStashApplied?: () => void
}

export default function StashManager({ repoPaths, onStashApplied }: StashManagerProps) {
  const [stashes, setStashes] = useState<Record<string, Stash[]>>({})
  const [loading, setLoading] = useState(false)
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set())
  const [expandedStashes, setExpandedStashes] = useState<Set<string>>(new Set())
  const [stashDetails, setStashDetails] = useState<Record<string, StashDetails>>({})

  const fetchStashes = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`/api/workspaces/snapshots/dummy/list-stashes`, {
        repoPaths,
      })

      if (response.data.success) {
        setStashes(response.data.stashes || {})

        // Auto-expand repos with stashes
        const reposWithStashes = Object.keys(response.data.stashes || {})
        setExpandedRepos(new Set(reposWithStashes))
      }
    } catch (error: any) {
      console.error('Error fetching stashes:', error)
      toast.error('Failed to fetch stashes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (repoPaths.length > 0) {
      fetchStashes()
    }
  }, [repoPaths.join(',')])

  const toggleRepo = (repoPath: string) => {
    const newExpanded = new Set(expandedRepos)
    if (newExpanded.has(repoPath)) {
      newExpanded.delete(repoPath)
    } else {
      newExpanded.add(repoPath)
    }
    setExpandedRepos(newExpanded)
  }

  const handleApplyStash = async (repoPath: string, stashIndex: number, pop: boolean = false) => {
    // Confirm pop operation since it removes the stash
    if (pop && !confirm('Apply and remove this stash from the list? This will restore the changes to your working directory.')) {
      return
    }

    try {
      const response = await axios.post('/api/workspaces/stash/apply', {
        repoPath,
        stashIndex,
        pop,
      })

      if (response.data.success) {
        toast.success(response.data.message)
        await fetchStashes()
        onStashApplied?.()
      } else {
        toast.error(response.data.message || 'Failed to apply stash')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message

      // Check for merge conflicts
      if (errorMessage.toLowerCase().includes('conflict')) {
        toast.error(
          'Stash conflicts with current changes. Please resolve conflicts manually or commit/stash your current changes first.',
          { duration: 7000 }
        )
      } else {
        toast.error(`Failed to apply stash: ${errorMessage}`)
      }
    }
  }

  const handleDropStash = async (repoPath: string, stashIndex: number) => {
    if (!confirm('Are you sure you want to delete this stash? This action cannot be undone.')) {
      return
    }

    try {
      const response = await axios.post('/api/workspaces/stash/drop', {
        repoPath,
        stashIndex,
      })

      if (response.data.success) {
        toast.success(response.data.message)
        await fetchStashes()
      } else {
        toast.error(response.data.message || 'Failed to delete stash')
      }
    } catch (error: any) {
      toast.error(`Failed to delete stash: ${error.response?.data?.error || error.message}`)
    }
  }

  const toggleStashDetails = async (repoPath: string, stashIndex: number) => {
    const key = `${repoPath}:${stashIndex}`
    const newExpanded = new Set(expandedStashes)

    if (newExpanded.has(key)) {
      newExpanded.delete(key)
      setExpandedStashes(newExpanded)
    } else {
      newExpanded.add(key)
      setExpandedStashes(newExpanded)

      if (!stashDetails[key]) {
        try {
          const response = await axios.get('/api/workspaces/stash/details', {
            params: { repoPath, stashIndex },
          })

          if (response.data.success) {
            setStashDetails((prev) => ({
              ...prev,
              [key]: response.data,
            }))
          } else {
            toast.error('Failed to fetch stash details')
          }
        } catch (error: any) {
          toast.error(`Failed to fetch stash details: ${error.response?.data?.error || error.message}`)
        }
      }
    }
  }

  const totalStashes = Object.values(stashes).reduce((sum, arr) => sum + arr.length, 0)

  if (loading && totalStashes === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Stash Manager
          </h3>
        </div>
        <div className="text-sm text-gray-500">Loading stashes...</div>
      </div>
    )
  }

  if (totalStashes === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Stash Manager
          </h3>
          <button
            onClick={fetchStashes}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-gray-500">
          No stashes found. Stashes are created when you restore a snapshot with uncommitted changes.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Archive className="w-5 h-5" />
          Stash Manager
          <span className="text-sm font-normal text-gray-500">({totalStashes})</span>
        </h3>
        <button
          onClick={fetchStashes}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(stashes).map(([repoPath, repoStashes]) => {
          const isExpanded = expandedRepos.has(repoPath)
          const repoName = repoPath.split('/').pop() || repoPath

          return (
            <div key={repoPath} className="border rounded-lg">
              <button
                onClick={() => toggleRepo(repoPath)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <GitBranch className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">{repoName}</span>
                  <span className="text-xs text-gray-500">({repoStashes.length} stashes)</span>
                </div>
                <span className="text-xs text-gray-400 truncate max-w-md" title={repoPath}>
                  {repoPath}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t divide-y">
                  {repoStashes.map((stash) => {
                    const stashKey = `${repoPath}:${stash.index}`
                    const isStashExpanded = expandedStashes.has(stashKey)
                    const details = stashDetails[stashKey]

                    return (
                      <div key={stash.index}>
                        <div className="p-3 hover:bg-gray-50 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                                stash@{'{' + stash.index + '}'}
                              </span>
                              {details?.summary?.untrackedFiles > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Archive className="w-3 h-3" />
                                  {details.summary.untrackedFiles} untracked
                                </span>
                              )}
                              <span className="text-xs text-gray-500">{stash.date}</span>
                            </div>
                            <p className="text-sm text-gray-700 truncate" title={stash.message}>
                              {stash.message}
                            </p>
                            <p className="text-xs text-gray-400 font-mono mt-1">{stash.hash.substring(0, 8)}</p>
                          </div>

                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => toggleStashDetails(repoPath, stash.index)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded text-xs flex items-center gap-1"
                              title="View details"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {isStashExpanded ? 'Hide' : 'Details'}
                            </button>
                            <button
                              onClick={() => handleApplyStash(repoPath, stash.index, false)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs flex items-center gap-1"
                              title="Apply (keep in stash)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Apply
                            </button>
                            <button
                              onClick={() => handleApplyStash(repoPath, stash.index, true)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded text-xs flex items-center gap-1"
                              title="Pop (apply and remove)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Pop
                            </button>
                            <button
                              onClick={() => handleDropStash(repoPath, stash.index)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Delete stash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isStashExpanded && details && (
                          <div className="px-3 pb-3 bg-gray-50">
                            <div className="border-t pt-2 mt-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-gray-700">
                                  File Changes ({details.summary.totalFiles} files)
                                </h4>
                                <div className="flex gap-3 text-xs">
                                  <span className="text-green-600">+{details.summary.totalInsertions}</span>
                                  <span className="text-red-600">-{details.summary.totalDeletions}</span>
                                </div>
                              </div>
                              <div className="space-y-1 max-h-64 overflow-y-auto">
                                {details.files.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between text-xs p-2 rounded border ${
                                      file.isUntracked ? 'bg-blue-50 border-blue-200' : 'bg-white'
                                    }`}
                                  >
                                    <span className="font-mono text-gray-700 truncate flex-1" title={file.file}>
                                      {file.file}
                                    </span>
                                    <div className="flex gap-2 ml-2 flex-shrink-0">
                                      {file.isUntracked ? (
                                        <span className="text-blue-600 text-xs">new file</span>
                                      ) : (
                                        <>
                                          {file.insertions > 0 && (
                                            <span className="text-green-600">+{file.insertions}</span>
                                          )}
                                          {file.deletions > 0 && (
                                            <span className="text-red-600">-{file.deletions}</span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 border-t pt-3">
        <p className="mb-1">
          <strong>Apply:</strong> Restore stashed changes and keep them in the stash list
        </p>
        <p>
          <strong>Pop:</strong> Restore stashed changes and remove from the stash list
        </p>
      </div>
    </div>
  )
}
