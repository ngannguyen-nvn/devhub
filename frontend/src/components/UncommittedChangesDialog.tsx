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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Uncommitted Changes Detected</h2>
              <p className="text-sm text-gray-600 mt-1">
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
              <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                  <span className="font-mono text-sm font-semibold">{repo.path}</span>
                </div>
                <div className="ml-6 text-sm space-y-1">
                  {repo.files.modified.length > 0 && (
                    <div className="text-yellow-700">
                      Modified: {repo.files.modified.length} {repo.files.modified.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                  {repo.files.added.length > 0 && (
                    <div className="text-green-700">
                      Added: {repo.files.added.length} {repo.files.added.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                  {repo.files.deleted.length > 0 && (
                    <div className="text-red-700">
                      Deleted: {repo.files.deleted.length} {repo.files.deleted.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                  {repo.files.renamed.length > 0 && (
                    <div className="text-blue-700">
                      Renamed: {repo.files.renamed.length} {repo.files.renamed.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Commit message form (if showing) */}
          {showCommitForm && (
            <div className="mb-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Commit Message
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Enter commit message..."
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                autoFocus
                disabled={loading}
              />
            </div>
          )}

          {/* Action explanation */}
          {!showCommitForm && (
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-semibold">Choose an option:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  <strong>Stash Changes:</strong> Temporarily save your changes and restore them later with{' '}
                  <code className="bg-gray-100 px-1 rounded">git stash pop</code>
                </li>
                <li>
                  <strong>Commit Changes:</strong> Create a new commit with all uncommitted changes
                </li>
                <li>
                  <strong>Cancel:</strong> Go back without restoring the snapshot
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>

          {showCommitForm ? (
            <>
              <button
                onClick={() => setShowCommitForm(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                <GitBranch className="w-4 h-4" />
                {loading ? 'Stashing...' : 'Stash & Restore'}
              </button>
              <button
                onClick={() => setShowCommitForm(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
