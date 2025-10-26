import { useEffect, useState } from 'react'
import {
  Package,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Container,
  FileCode,
  Download,
  Plus
} from 'lucide-react'
import axios from 'axios'

interface DockerImage {
  id: string
  repoTags: string[]
  size: number
  created: number
  containers: number
}

interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: Array<{
    privatePort: number
    publicPort?: number
    type: string
  }>
  created: number
}

export default function Docker() {
  const [activeTab, setActiveTab] = useState<'images' | 'containers'>('images')
  const [images, setImages] = useState<DockerImage[]>([])
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [loading, setLoading] = useState(false)
  const [dockerAvailable, setDockerAvailable] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null)
  const [containerLogs, setContainerLogs] = useState<string[]>([])

  // Build image form
  const [showBuildForm, setShowBuildForm] = useState(false)
  const [buildForm, setBuildForm] = useState({
    contextPath: '',
    dockerfilePath: 'Dockerfile',
    tag: '',
  })
  const [buildLogs, setBuildLogs] = useState<string[]>([])
  const [building, setBuilding] = useState(false)

  // Run container form
  const [showRunForm, setShowRunForm] = useState(false)
  const [runForm, setRunForm] = useState({
    imageName: '',
    containerName: '',
    ports: '',
    env: '',
  })

  // Check Docker availability
  const checkDocker = async () => {
    try {
      const response = await axios.get('/api/docker/ping')
      setDockerAvailable(response.data.available)
    } catch (error) {
      console.error('Error checking Docker:', error)
      setDockerAvailable(false)
    }
  }

  // Fetch images
  const fetchImages = async () => {
    if (!dockerAvailable) return
    setLoading(true)
    try {
      const response = await axios.get('/api/docker/images')
      setImages(response.data.images || [])
    } catch (error) {
      console.error('Error fetching images:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch containers
  const fetchContainers = async () => {
    if (!dockerAvailable) return
    setLoading(true)
    try {
      const response = await axios.get('/api/docker/containers?all=true')
      setContainers(response.data.containers || [])
    } catch (error) {
      console.error('Error fetching containers:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch container logs
  const fetchContainerLogs = async (containerId: string) => {
    try {
      const response = await axios.get(`/api/docker/containers/${containerId}/logs`)
      setContainerLogs(response.data.logs || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  useEffect(() => {
    checkDocker()
  }, [])

  useEffect(() => {
    if (dockerAvailable) {
      if (activeTab === 'images') {
        fetchImages()
        const interval = setInterval(fetchImages, 5000)
        return () => clearInterval(interval)
      } else {
        fetchContainers()
        const interval = setInterval(fetchContainers, 3000)
        return () => clearInterval(interval)
      }
    }
  }, [dockerAvailable, activeTab])

  useEffect(() => {
    if (selectedContainer) {
      fetchContainerLogs(selectedContainer)
      const interval = setInterval(() => fetchContainerLogs(selectedContainer), 2000)
      return () => clearInterval(interval)
    }
  }, [selectedContainer])

  // Build image
  const handleBuildImage = async () => {
    if (!buildForm.contextPath || !buildForm.tag) {
      alert('Context path and tag are required')
      return
    }

    setBuilding(true)
    setBuildLogs([])

    try {
      const response = await fetch('/api/docker/images/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildForm),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n\n')

          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6))
                if (data.stream) {
                  setBuildLogs(prev => [...prev, data.stream.trim()])
                }
                if (data.success) {
                  setShowBuildForm(false)
                  setBuildForm({ contextPath: '', dockerfilePath: 'Dockerfile', tag: '' })
                  fetchImages()
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          })
        }
      }
    } catch (error: any) {
      console.error('Build error:', error)
      alert(`Build failed: ${error.message}`)
    } finally {
      setBuilding(false)
    }
  }

  // Remove image
  const handleRemoveImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to remove this image?')) return

    try {
      await axios.delete(`/api/docker/images/${imageId}?force=true`)
      fetchImages()
    } catch (error: any) {
      alert(`Failed to remove image: ${error.response?.data?.error || error.message}`)
    }
  }

  // Run container
  const handleRunContainer = async () => {
    if (!runForm.imageName || !runForm.containerName) {
      alert('Image name and container name are required')
      return
    }

    try {
      const ports: Record<string, string> = {}
      if (runForm.ports) {
        runForm.ports.split(',').forEach(mapping => {
          const [containerPort, hostPort] = mapping.split(':')
          if (containerPort && hostPort) {
            ports[containerPort.trim()] = hostPort.trim()
          }
        })
      }

      const env = runForm.env ? runForm.env.split(',').map(e => e.trim()) : []

      await axios.post('/api/docker/containers/run', {
        imageName: runForm.imageName,
        containerName: runForm.containerName,
        ports,
        env,
      })

      setShowRunForm(false)
      setRunForm({ imageName: '', containerName: '', ports: '', env: '' })
      fetchContainers()
    } catch (error: any) {
      alert(`Failed to run container: ${error.response?.data?.error || error.message}`)
    }
  }

  // Start container
  const handleStartContainer = async (containerId: string) => {
    try {
      await axios.post(`/api/docker/containers/${containerId}/start`)
      fetchContainers()
    } catch (error: any) {
      alert(`Failed to start container: ${error.response?.data?.error || error.message}`)
    }
  }

  // Stop container
  const handleStopContainer = async (containerId: string) => {
    try {
      await axios.post(`/api/docker/containers/${containerId}/stop`)
      fetchContainers()
    } catch (error: any) {
      alert(`Failed to stop container: ${error.response?.data?.error || error.message}`)
    }
  }

  // Remove container
  const handleRemoveContainer = async (containerId: string) => {
    if (!confirm('Are you sure you want to remove this container?')) return

    try {
      await axios.delete(`/api/docker/containers/${containerId}?force=true`)
      if (selectedContainer === containerId) {
        setSelectedContainer(null)
      }
      fetchContainers()
    } catch (error: any) {
      alert(`Failed to remove container: ${error.response?.data?.error || error.message}`)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  if (!dockerAvailable) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Container className="w-8 h-8 text-yellow-600" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">Docker Not Available</h3>
              <p className="text-yellow-700 mt-1">
                Docker is not running or not installed. Please start Docker and refresh.
              </p>
              <button
                onClick={checkDocker}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Check Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Docker Management</h1>
        <button
          onClick={() => activeTab === 'images' ? fetchImages() : fetchContainers()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'images'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Images ({images.length})
        </button>
        <button
          onClick={() => setActiveTab('containers')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'containers'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Container className="w-4 h-4 inline mr-2" />
          Containers ({containers.length})
        </button>
      </div>

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div>
          <div className="mb-4">
            <button
              onClick={() => setShowBuildForm(!showBuildForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Build Image
            </button>
          </div>

          {/* Build Form */}
          {showBuildForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-xl font-bold mb-4">Build Docker Image</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Context Path</label>
                  <input
                    type="text"
                    value={buildForm.contextPath}
                    onChange={(e) => setBuildForm({ ...buildForm, contextPath: e.target.value })}
                    placeholder="/path/to/project"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dockerfile Path</label>
                  <input
                    type="text"
                    value={buildForm.dockerfilePath}
                    onChange={(e) => setBuildForm({ ...buildForm, dockerfilePath: e.target.value })}
                    placeholder="Dockerfile"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Image Tag</label>
                  <input
                    type="text"
                    value={buildForm.tag}
                    onChange={(e) => setBuildForm({ ...buildForm, tag: e.target.value })}
                    placeholder="my-app:latest"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                {building && buildLogs.length > 0 && (
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-48 overflow-y-auto">
                    {buildLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleBuildImage}
                    disabled={building}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {building ? 'Building...' : 'Build'}
                  </button>
                  <button
                    onClick={() => setShowBuildForm(false)}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Images List */}
          <div className="grid gap-4">
            {loading && images.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Loading images...</div>
            ) : images.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No Docker images found</div>
            ) : (
              images.map(image => (
                <div key={image.id} className="bg-white p-4 rounded-lg shadow hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">
                          {image.repoTags[0]}
                        </h3>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <div>ID: {image.id}</div>
                        <div>Size: {formatBytes(image.size)}</div>
                        <div>Created: {formatDate(image.created)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove Image"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Containers Tab */}
      {activeTab === 'containers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Containers List */}
          <div>
            <div className="mb-4">
              <button
                onClick={() => setShowRunForm(!showRunForm)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Run Container
              </button>
            </div>

            {/* Run Form */}
            {showRunForm && (
              <div className="bg-white p-6 rounded-lg shadow-md mb-4">
                <h2 className="text-xl font-bold mb-4">Run New Container</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Image Name</label>
                    <input
                      type="text"
                      value={runForm.imageName}
                      onChange={(e) => setRunForm({ ...runForm, imageName: e.target.value })}
                      placeholder="nginx:latest"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Container Name</label>
                    <input
                      type="text"
                      value={runForm.containerName}
                      onChange={(e) => setRunForm({ ...runForm, containerName: e.target.value })}
                      placeholder="my-container"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Port Mappings</label>
                    <input
                      type="text"
                      value={runForm.ports}
                      onChange={(e) => setRunForm({ ...runForm, ports: e.target.value })}
                      placeholder="80:8080, 443:8443"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Environment Variables</label>
                    <input
                      type="text"
                      value={runForm.env}
                      onChange={(e) => setRunForm({ ...runForm, env: e.target.value })}
                      placeholder="KEY=value, FOO=bar"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRunContainer}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Run
                    </button>
                    <button
                      onClick={() => setShowRunForm(false)}
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Containers List */}
            <div className="space-y-4">
              {loading && containers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Loading containers...</div>
              ) : containers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No containers found</div>
              ) : (
                containers.map(container => (
                  <div
                    key={container.id}
                    onClick={() => setSelectedContainer(container.id)}
                    className={`bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md ${
                      selectedContainer === container.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Container className="w-5 h-5 text-green-600" />
                          <h3 className="font-semibold">{container.name}</h3>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              container.state === 'running'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {container.state}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          <div>Image: {container.image}</div>
                          <div>ID: {container.id}</div>
                          {container.ports.length > 0 && (
                            <div>
                              Ports: {container.ports.map(p =>
                                p.publicPort ? `${p.publicPort}:${p.privatePort}` : p.privatePort
                              ).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {container.state === 'running' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStopContainer(container.id)
                            }}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="Stop"
                          >
                            <Square className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartContainer(container.id)
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Start"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveContainer(container.id)
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Remove"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Container Logs */}
          {selectedContainer && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Container Logs</h2>
                <button
                  onClick={() => fetchContainerLogs(selectedContainer)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
                {containerLogs.length === 0 ? (
                  <div className="text-gray-500">No logs available</div>
                ) : (
                  containerLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
