import { useState, useEffect } from 'react'
import { GitBranch, Trash2, RotateCcw, Archive, RefreshCw, ChevronDown, ChevronRight, FileText, Search, X } from 'lucide-react'
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
  const [searchTerm, setSearchTerm] = useState('')

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

  // Filter stashes by repo name or path
  const filteredStashes = Object.entries(stashes).filter(([repoPath]) => {
    if (!searchTerm.trim()) return true
    const search = searchTerm.toLowerCase()
    const repoName = repoPath.split('/').pop() || ''
    return (
      repoName.toLowerCase().includes(search) ||
      repoPath.toLowerCase().includes(search)
    )
  }).reduce((acc, [repoPath, repoStashes]) => {
    acc[repoPath] = repoStashes
    return acc
  }, {} as Record<string, Stash[]>)

  const totalStashes = Object.values(stashes).reduce((sum, arr) => sum + arr.length, 0)
  const filteredTotalStashes = Object.values(filteredStashes).reduce((sum, arr) => sum + arr.length, 0)

  if (loading && totalStashes === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Archive className="w-5 h-5 text-[hsl(var(--primary))]" />
            Stash Manager
          </h3>
        </div>
        <div className="text-sm text-[hsl(var(--foreground-muted))]">Loading stashes...</div>
      </div>
    )
  }

  if (totalStashes === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Archive className="w-5 h-5 text-[hsl(var(--primary))]" />
            Stash Manager
          </h3>
          <button
            onClick={fetchStashes}
            className="p-2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsla(var(--primary),0.1)] rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-[hsl(var(--foreground-muted))]">
          No stashes found. Stashes are created when you restore a snapshot with uncommitted changes.
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
          <Archive className="w-5 h-5 text-[hsl(var(--primary))]" />
          Stash Manager
          <span className="text-sm font-normal text-[hsl(var(--foreground-muted))]">
            ({searchTerm ? `${filteredTotalStashes} / ${totalStashes}` : totalStashes})
          </span>
        </h3>
        <button
          onClick={fetchStashes}
          disabled={loading}
          className="p-2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsla(var(--primary),0.1)] rounded-lg disabled:opacity-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-4 relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search repositories..."
          className="input-field pl-10"
        />
        <Search className="absolute left-3 top-3.5 w-4 h-4 text-[hsl(var(--foreground-muted))]" />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-3.5 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filteredTotalStashes === 0 && searchTerm ? (
        <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p>No stashes match your search</p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 text-[hsl(var(--primary))] hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(filteredStashes).map(([repoPath, repoStashes]) => {
          const isExpanded = expandedRepos.has(repoPath)
          const repoName = repoPath.split('/').pop() || repoPath

          return (
            <div key={repoPath} className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleRepo(repoPath)}
                className="w-full flex items-center justify-between p-3 hover:bg-[hsla(var(--primary),0.05)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[hsl(var(--foreground-muted))]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[hsl(var(--foreground-muted))]" />
                  )}
                  <GitBranch className="w-4 h-4 text-[hsl(var(--info))]" />
                  <span className="font-medium text-sm text-[hsl(var(--foreground))]">{repoName}</span>
                  <span className="text-xs text-[hsl(var(--foreground-muted))]">({repoStashes.length} stashes)</span>
                </div>
                <span className="text-xs text-[hsl(var(--foreground-muted))] truncate max-w-md terminal-text" title={repoPath}>
                  {repoPath}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]">
                  {repoStashes.map((stash) => {
                    const stashKey = `${repoPath}:${stash.index}`
                    const isStashExpanded = expandedStashes.has(stashKey)
                    const details = stashDetails[stashKey]

                    return (
                      <div key={stash.index}>
                        <div className="p-3 hover:bg-[hsla(var(--primary),0.05)] flex items-start justify-between gap-3 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs terminal-text bg-[hsl(var(--background))] px-2 py-0.5 rounded text-[hsl(var(--foreground-muted))]">
                                stash@{'{' + stash.index + '}'}
                              </span>
                              {details?.summary?.untrackedFiles > 0 && (
                                <span className="text-xs bg-[hsla(var(--info),0.15)] text-[hsl(var(--info))] px-2 py-0.5 rounded flex items-center gap-1">
                                  <Archive className="w-3 h-3" />
                                  {details.summary.untrackedFiles} untracked
                                </span>
                              )}
                              <span className="text-xs text-[hsl(var(--foreground-muted))]">{stash.date}</span>
                            </div>
                            <p className="text-sm text-[hsl(var(--foreground))] truncate" title={stash.message}>
                              {stash.message}
                            </p>
                            <p className="text-xs text-[hsl(var(--foreground-muted))] terminal-text mt-1">{stash.hash.substring(0, 8)}</p>
                          </div>

                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => toggleStashDetails(repoPath, stash.index)}
                              className="p-1.5 text-[hsl(var(--foreground-muted))] hover:bg-[hsla(var(--primary),0.1)] rounded text-xs flex items-center gap-1 transition-colors"
                              title="View details"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {isStashExpanded ? 'Hide' : 'Details'}
                            </button>
                            <button
                              onClick={() => handleApplyStash(repoPath, stash.index, false)}
                              className="p-1.5 text-[hsl(var(--info))] hover:bg-[hsla(var(--info),0.1)] rounded text-xs flex items-center gap-1 transition-colors"
                              title="Apply (keep in stash)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Apply
                            </button>
                            <button
                              onClick={() => handleApplyStash(repoPath, stash.index, true)}
                              className="p-1.5 text-[hsl(var(--success))] hover:bg-[hsla(var(--success),0.1)] rounded text-xs flex items-center gap-1 transition-colors"
                              title="Pop (apply and remove)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Pop
                            </button>
                            <button
                              onClick={() => handleDropStash(repoPath, stash.index)}
                              className="p-1.5 text-[hsl(var(--danger))] hover:bg-[hsla(var(--danger),0.1)] rounded transition-colors"
                              title="Delete stash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isStashExpanded && details && (
                          <div className="px-3 pb-3 bg-[hsl(var(--background))]">
                            <div className="border-t border-[hsl(var(--border))] pt-2 mt-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">
                                  File Changes ({details.summary.totalFiles} files)
                                </h4>
                                <div className="flex gap-3 text-xs">
                                  <span className="text-[hsl(var(--success))]">+{details.summary.totalInsertions}</span>
                                  <span className="text-[hsl(var(--danger))]">-{details.summary.totalDeletions}</span>
                                </div>
                              </div>
                              <div className="space-y-1 max-h-64 overflow-y-auto">
                                {details.files.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between text-xs p-2 rounded-lg border ${
                                      file.isUntracked
                                        ? 'bg-[hsla(var(--info),0.1)] border-[hsla(var(--info),0.2)]'
                                        : 'bg-[hsl(var(--background-elevated))] border-[hsl(var(--border))]'
                                    }`}
                                  >
                                    <span className="terminal-text text-[hsl(var(--foreground))] truncate flex-1" title={file.file}>
                                      {file.file}
                                    </span>
                                    <div className="flex gap-2 ml-2 flex-shrink-0">
                                      {file.isUntracked ? (
                                        <span className="text-[hsl(var(--info))] text-xs">new file</span>
                                      ) : (
                                        <>
                                          {file.insertions > 0 && (
                                            <span className="text-[hsl(var(--success))]">+{file.insertions}</span>
                                          )}
                                          {file.deletions > 0 && (
                                            <span className="text-[hsl(var(--danger))]">-{file.deletions}</span>
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
      )}

      <div className="mt-4 text-xs text-[hsl(var(--foreground-muted))] border-t border-[hsl(var(--border))] pt-3">
        <p className="mb-1">
          <strong className="text-[hsl(var(--foreground))]">Apply:</strong> Restore stashed changes and keep them in the stash list
        </p>
        <p>
          <strong className="text-[hsl(var(--foreground))]">Pop:</strong> Restore stashed changes and remove from the stash list
        </p>
      </div>
    </div>
  )
}
