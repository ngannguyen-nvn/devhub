import { useState } from 'react'
import { AlertTriangle, GitBranch, Save, MessageSquare } from 'lucide-react'

interface UncommittedChange {
  path: string
  hasChanges: boolean
  files: {
    modified: string[]
    added: string[]
    deleted: string[]
    renamed: string[]
  }
}

interface UncommittedChangesDialogProps {
  isOpen: boolean
  changes: UncommittedChange[]
  onStash: () => void
  onCommit: (message: string) => void
  onCancel: () => void
  loading?: boolean
}

export default function UncommittedChangesDialog({
  isOpen,
  changes,
  onStash,
  onCommit,
  onCancel,
  loading = false,
}: UncommittedChangesDialogProps) {
  const [commitMessage, setCommitMessage] = useState('')
  const [showCommitForm, setShowCommitForm] = useState(false)

  if (!isOpen) return null

  const reposWithChanges = changes.filter(c => c.hasChanges)
  const totalFiles = reposWithChanges.reduce(
    (acc, repo) =>
      acc +
      repo.files.modified.length +
      repo.files.added.length +
      repo.files.deleted.length +
      repo.files.renamed.length,
    0
  )

  const handleCommit = () => {
    if (!commitMessage.trim()) {
      return
    }
    onCommit(commitMessage)
  }

  return (
    <div className="fixed inset-0 bg-[hsla(var(--background),0.8)] backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-card rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-[hsl(var(--border))] bg-[hsla(var(--warning),0.1)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-[hsl(var(--warning))] flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Uncommitted Changes Detected</h2>
              <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1">
                {reposWithChanges.length} {reposWithChanges.length === 1 ? 'repository has' : 'repositories have'}{' '}
                uncommitted changes ({totalFiles} {totalFiles === 1 ? 'file' : 'files'}). You need to handle{' '}
                {reposWithChanges.length === 1 ? 'it' : 'them'} before restoring the snapshot.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* List of repositories with changes */}
          <div className="space-y-4 mb-6">
            {reposWithChanges.map((repo, idx) => (
              <div key={idx} className="border border-[hsl(var(--border))] rounded-xl p-4 bg-[hsl(var(--background))]">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4 text-[hsl(var(--info))]" />
                  <span className="terminal-text text-sm font-semibold text-[hsl(var(--foreground))]">{repo.path}</span>
                </div>
                <div className="ml-6 text-sm space-y-1">
                  {repo.files.modified.length > 0 && (
                    <div className="text-[hsl(var(--warning))]">
                      Modified: {repo.files.modified.length} {repo.files.modified.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                  {repo.files.added.length > 0 && (
                    <div className="text-[hsl(var(--success))]">
                      Added: {repo.files.added.length} {repo.files.added.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                  {repo.files.deleted.length > 0 && (
                    <div className="text-[hsl(var(--danger))]">
                      Deleted: {repo.files.deleted.length} {repo.files.deleted.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                  {repo.files.renamed.length > 0 && (
                    <div className="text-[hsl(var(--info))]">
                      Renamed: {repo.files.renamed.length} {repo.files.renamed.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Commit message form (if showing) */}
          {showCommitForm && (
            <div className="mb-4 p-4 border-2 border-[hsla(var(--info),0.3)] rounded-xl bg-[hsla(var(--info),0.1)]">
              <label className="text-sm font-semibold mb-2 flex items-center gap-2 text-[hsl(var(--foreground))]">
                <MessageSquare className="w-4 h-4 text-[hsl(var(--info))]" />
                Commit Message
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Enter commit message..."
                className="input-field resize-none"
                rows={3}
                autoFocus
                disabled={loading}
              />
            </div>
          )}

          {/* Action explanation */}
          {!showCommitForm && (
            <div className="text-sm text-[hsl(var(--foreground-muted))] space-y-2">
              <p className="font-semibold text-[hsl(var(--foreground))]">Choose an option:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  <strong className="text-[hsl(var(--foreground))]">Stash Changes:</strong> Temporarily save your changes and restore them later with{' '}
                  <code className="bg-[hsl(var(--background))] px-1.5 py-0.5 rounded terminal-text text-[hsl(var(--primary))]">git stash pop</code>
                </li>
                <li>
                  <strong className="text-[hsl(var(--foreground))]">Commit Changes:</strong> Create a new commit with all uncommitted changes
                </li>
                <li>
                  <strong className="text-[hsl(var(--foreground))]">Cancel:</strong> Go back without restoring the snapshot
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-[hsl(var(--background-elevated))] text-[hsl(var(--foreground-muted))] rounded-xl hover:bg-[hsl(var(--border))] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>

          {showCommitForm ? (
            <>
              <button
                onClick={() => setShowCommitForm(false)}
                disabled={loading}
                className="px-4 py-2 bg-[hsl(var(--background-elevated))] text-[hsl(var(--foreground-muted))] rounded-xl hover:bg-[hsl(var(--border))] disabled:opacity-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Committing...' : 'Commit & Restore'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onStash}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--warning))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
              >
                <GitBranch className="w-4 h-4" />
                {loading ? 'Stashing...' : 'Stash & Restore'}
              </button>
              <button
                onClick={() => setShowCommitForm(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl disabled:opacity-50"
              >
                <MessageSquare className="w-4 h-4" />
                Commit & Restore
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
