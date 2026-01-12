import { useEffect, useState } from 'react'
import {
  Package,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Container,
  Plus
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ConfirmDialog from './ConfirmDialog'
import { SkeletonLoader } from './Loading'

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

interface ComposeService {
  name: string
  image?: string
  build?: { context: string; dockerfile: string }
  ports?: string[]
  environment?: Record<string, string>
  volumes?: string[]
  dependsOn?: string[]
}

export default function Docker() {
  const [activeTab, setActiveTab] = useState<'images' | 'containers' | 'compose'>('images')
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

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'image' | 'container'
    id: string | null
    name: string
  }>({
    isOpen: false,
    type: 'image',
    id: null,
    name: '',
  })

  // Docker Compose state
  const [composeServices, setComposeServices] = useState<ComposeService[]>([])
  const [generatedYaml, setGeneratedYaml] = useState<string>('')
  const [showAddServiceForm, setShowAddServiceForm] = useState(false)
  const [newComposeService, setNewComposeService] = useState<ComposeService>({
    name: '',
    image: '',
    ports: [],
    environment: {},
    volumes: [],
    dependsOn: [],
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
      toast.error('Context path and tag are required')
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
                  toast.success(`Image "${buildForm.tag}" built successfully`)
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
      toast.error(`Build failed: ${error.message}`)
    } finally {
      setBuilding(false)
    }
  }

  // Remove image
  const handleRemoveImage = (imageId: string, imageName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'image',
      id: imageId,
      name: imageName,
    })
  }

  const confirmRemoveImage = async () => {
    if (!confirmDialog.id) return

    try {
      await axios.delete(`/api/docker/images/${confirmDialog.id}?force=true`)
      fetchImages()
      toast.success('Image removed successfully')
    } catch (error: any) {
      toast.error(`Failed to remove image: ${error.response?.data?.error || error.message}`)
    }
  }

  // Run container
  const handleRunContainer = async () => {
    if (!runForm.imageName || !runForm.containerName) {
      toast.error('Image name and container name are required')
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
      toast.success(`Container "${runForm.containerName}" started successfully`)
    } catch (error: any) {
      toast.error(`Failed to run container: ${error.response?.data?.error || error.message}`)
    }
  }

  // Start container
  const handleStartContainer = async (containerId: string) => {
    try {
      await axios.post(`/api/docker/containers/${containerId}/start`)
      fetchContainers()
      toast.success('Container started successfully')
    } catch (error: any) {
      toast.error(`Failed to start container: ${error.response?.data?.error || error.message}`)
    }
  }

  // Stop container
  const handleStopContainer = async (containerId: string) => {
    try {
      await axios.post(`/api/docker/containers/${containerId}/stop`)
      fetchContainers()
      toast.success('Container stopped successfully')
    } catch (error: any) {
      toast.error(`Failed to stop container: ${error.response?.data?.error || error.message}`)
    }
  }

  // Remove container
  const handleRemoveContainer = (containerId: string, containerName: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'container',
      id: containerId,
      name: containerName,
    })
  }

  const confirmRemoveContainer = async () => {
    if (!confirmDialog.id) return

    try {
      await axios.delete(`/api/docker/containers/${confirmDialog.id}?force=true`)
      if (selectedContainer === confirmDialog.id) {
        setSelectedContainer(null)
      }
      fetchContainers()
      toast.success('Container removed successfully')
    } catch (error: any) {
      toast.error(`Failed to remove container: ${error.response?.data?.error || error.message}`)
    }
  }

  // Docker Compose handlers
  const handleAddComposeService = () => {
    if (!newComposeService.name) {
      toast.error('Service name is required')
      return
    }

    setComposeServices([...composeServices, { ...newComposeService }])
    setNewComposeService({
      name: '',
      image: '',
      ports: [],
      environment: {},
      volumes: [],
      dependsOn: [],
    })
    setShowAddServiceForm(false)
    setGeneratedYaml('') // Clear previous YAML
    toast.success('Service added to compose')
  }

  const handleRemoveComposeService = (index: number) => {
    setComposeServices(composeServices.filter((_, i) => i !== index))
    setGeneratedYaml('') // Clear YAML when services change
    toast.success('Service removed from compose')
  }

  const handleGenerateCompose = async () => {
    if (composeServices.length === 0) {
      toast.error('Add at least one service to generate compose file')
      return
    }

    try {
      const response = await axios.post('/api/docker/compose/generate', {
        services: composeServices,
      })
      setGeneratedYaml(response.data.yaml)
      toast.success('Docker Compose YAML generated')
    } catch (error: any) {
      toast.error(`Failed to generate compose: ${error.response?.data?.error || error.message}`)
    }
  }

  const handleDownloadCompose = () => {
    if (!generatedYaml) {
      toast.error('Generate YAML first')
      return
    }

    const blob = new Blob([generatedYaml], { type: 'text/yaml' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'docker-compose.yml')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    toast.success('Compose file downloaded')
  }

  const handleImportCompose = async (file: File) => {
    try {
      const text = await file.text()
      setGeneratedYaml(text)
      toast.success('Compose file imported successfully')
      // You could also parse the YAML and populate composeServices here
    } catch (error: any) {
      toast.error(`Failed to import file: ${error.message}`)
    }
  }

  const handleClearCompose = () => {
    setComposeServices([])
    setGeneratedYaml('')
    toast.success('Compose configuration cleared')
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
      <div className="p-8" data-testid="docker-unavailable-container">
        <div className="glass-card border border-[hsl(var(--border))] rounded-xl p-6 bg-[hsla(var(--warning),0.1)]">
          <div className="flex items-center gap-3">
            <Container className="w-8 h-8 text-[hsl(var(--warning))]" />
            <div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Docker Not Available</h3>
              <p className="text-[hsl(var(--foreground-muted))] mt-1">
                Docker is not running or not installed. Please start Docker and refresh.
              </p>
              <button
                onClick={checkDocker}
                className="mt-3 px-4 py-2 bg-[hsl(var(--warning))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 transition-opacity"
                data-testid="docker-check-again-button"
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
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">Docker Management</h1>
        <button
          onClick={() => activeTab === 'images' ? fetchImages() : fetchContainers()}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80 transition-opacity"
          data-testid="docker-refresh-button"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[hsl(var(--border))]">
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'images'
              ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]'
          }`}
          data-testid="docker-images-tab"
        >
          <Package className="w-4 h-4 inline mr-2" />
          Images ({images.length})
        </button>
        <button
          onClick={() => setActiveTab('containers')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'containers'
              ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]'
          }`}
          data-testid="docker-containers-tab"
        >
          <Container className="w-4 h-4 inline mr-2" />
          Containers ({containers.length})
        </button>
        <button
          onClick={() => setActiveTab('compose')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'compose'
              ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]'
          }`}
          data-testid="docker-compose-tab"
        >
          <Package className="w-4 h-4 inline mr-2" />
          Compose
        </button>
      </div>

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div>
          <div className="mb-4">
            <button
              onClick={() => setShowBuildForm(!showBuildForm)}
              className="flex items-center gap-2 px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
              data-testid="docker-build-image-button"
            >
              <Plus className="w-4 h-4" />
              Build Image
            </button>
          </div>

          {/* Build Form */}
          {showBuildForm && (
            <div className="glass-card card-hover p-6 rounded-xl mb-6" data-testid="docker-build-form">
              <h2 className="text-xl font-bold mb-4 text-[hsl(var(--foreground))]">Build Docker Image</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Context Path</label>
                  <input
                    type="text"
                    value={buildForm.contextPath}
                    onChange={(e) => setBuildForm({ ...buildForm, contextPath: e.target.value })}
                    placeholder="/path/to/project"
                    className="input-field w-full terminal-text"
                    data-testid="docker-context-path-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Dockerfile Path</label>
                  <input
                    type="text"
                    value={buildForm.dockerfilePath}
                    onChange={(e) => setBuildForm({ ...buildForm, dockerfilePath: e.target.value })}
                    placeholder="Dockerfile"
                    className="input-field w-full terminal-text"
                    data-testid="docker-dockerfile-path-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Image Tag</label>
                  <input
                    type="text"
                    value={buildForm.tag}
                    onChange={(e) => setBuildForm({ ...buildForm, tag: e.target.value })}
                    placeholder="my-app:latest"
                    className="input-field w-full terminal-text"
                    data-testid="docker-image-tag-input"
                  />
                </div>

                {building && buildLogs.length > 0 && (
                  <div className="bg-[hsl(var(--background))] text-[hsl(var(--success))] p-4 rounded-xl terminal-text text-sm h-48 overflow-y-auto border border-[hsl(var(--border))]" data-testid="docker-build-logs">
                    {buildLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleBuildImage}
                    disabled={building}
                    className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl disabled:opacity-50"
                    data-testid="docker-build-submit-button"
                  >
                    {building ? 'Building...' : 'Build'}
                  </button>
                  <button
                    onClick={() => setShowBuildForm(false)}
                    className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80 transition-opacity"
                    data-testid="docker-build-cancel-button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Images List */}
          <div className="grid gap-4" data-testid="docker-images-list">
            {loading && images.length === 0 ? (
              <SkeletonLoader count={3} />
            ) : images.length === 0 ? (
              <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">No Docker images found</div>
            ) : (
              images.map(image => (
                <div key={image.id} className="glass-card card-hover p-4 rounded-xl" data-testid={`docker-image-item-${image.id}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[hsl(var(--primary))]" />
                        <h3 className="font-semibold text-lg text-[hsl(var(--foreground))] terminal-text">
                          {image.repoTags[0]}
                        </h3>
                      </div>
                      <div className="mt-2 text-sm text-[hsl(var(--foreground-muted))] space-y-1">
                        <div className="terminal-text">ID: {image.id}</div>
                        <div>Size: {formatBytes(image.size)}</div>
                        <div>Created: {formatDate(image.created)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveImage(image.id, image.repoTags[0] || 'Unknown')}
                      className="text-[hsl(var(--danger))] hover:opacity-80 transition-opacity"
                      title="Remove Image"
                      data-testid="docker-delete-image-button"
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
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 transition-opacity"
                data-testid="docker-run-container-button"
              >
                <Plus className="w-4 h-4" />
                Run Container
              </button>
            </div>

            {/* Run Form */}
            {showRunForm && (
              <div className="glass-card card-hover p-6 rounded-xl mb-4" data-testid="docker-run-form">
                <h2 className="text-xl font-bold mb-4 text-[hsl(var(--foreground))]">Run New Container</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Image Name</label>
                    <input
                      type="text"
                      value={runForm.imageName}
                      onChange={(e) => setRunForm({ ...runForm, imageName: e.target.value })}
                      placeholder="nginx:latest"
                      className="input-field w-full terminal-text"
                      data-testid="docker-image-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Container Name</label>
                    <input
                      type="text"
                      value={runForm.containerName}
                      onChange={(e) => setRunForm({ ...runForm, containerName: e.target.value })}
                      placeholder="my-container"
                      className="input-field w-full terminal-text"
                      data-testid="docker-container-name-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Port Mappings</label>
                    <input
                      type="text"
                      value={runForm.ports}
                      onChange={(e) => setRunForm({ ...runForm, ports: e.target.value })}
                      placeholder="80:8080, 443:8443"
                      className="input-field w-full terminal-text"
                      data-testid="docker-port-mappings-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Environment Variables</label>
                    <input
                      type="text"
                      value={runForm.env}
                      onChange={(e) => setRunForm({ ...runForm, env: e.target.value })}
                      placeholder="KEY=value, FOO=bar"
                      className="input-field w-full terminal-text"
                      data-testid="docker-env-vars-input"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRunContainer}
                      className="px-4 py-2 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 transition-opacity"
                      data-testid="docker-run-submit-button"
                    >
                      Run
                    </button>
                    <button
                      onClick={() => setShowRunForm(false)}
                      className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80 transition-opacity"
                      data-testid="docker-run-cancel-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Containers List */}
            <div className="space-y-4" data-testid="docker-containers-list">
              {loading && containers.length === 0 ? (
                <SkeletonLoader count={3} />
              ) : containers.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">No containers found</div>
              ) : (
                containers.map(container => (
                  <div
                    key={container.id}
                    onClick={() => setSelectedContainer(container.id)}
                    className={`glass-card card-hover p-4 rounded-xl cursor-pointer ${
                      selectedContainer === container.id ? 'ring-2 ring-[hsl(var(--primary))]' : ''
                    }`}
                    data-testid={`docker-container-item-${container.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Container className="w-5 h-5 text-[hsl(var(--success))]" />
                          <h3 className="font-semibold text-[hsl(var(--foreground))]">{container.name}</h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-xl ${
                              container.state === 'running'
                                ? 'bg-[hsla(var(--success),0.1)] text-[hsl(var(--success))]'
                                : 'bg-[hsl(var(--border))] text-[hsl(var(--foreground-muted))]'
                            }`}
                          >
                            {container.state}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-[hsl(var(--foreground-muted))] space-y-1">
                          <div className="terminal-text">Image: {container.image}</div>
                          <div className="terminal-text">ID: {container.id}</div>
                          {container.ports.length > 0 && (
                            <div className="terminal-text">
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
                            className="text-[hsl(var(--warning))] hover:opacity-80 transition-opacity"
                            title="Stop"
                            data-testid="docker-stop-container-button"
                          >
                            <Square className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartContainer(container.id)
                            }}
                            className="text-[hsl(var(--success))] hover:opacity-80 transition-opacity"
                            title="Start"
                            data-testid="docker-start-container-button"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveContainer(container.id, container.name)
                          }}
                          className="text-[hsl(var(--danger))] hover:opacity-80 transition-opacity"
                          title="Remove"
                          data-testid="docker-delete-container-button"
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
            <div className="glass-card p-4 rounded-xl" data-testid="docker-container-logs-panel">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Container Logs</h2>
                <button
                  onClick={() => fetchContainerLogs(selectedContainer)}
                  className="text-[hsl(var(--primary))] hover:opacity-80 transition-opacity"
                  data-testid="docker-refresh-logs-button"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-[hsl(var(--background))] text-[hsl(var(--success))] p-4 rounded-xl terminal-text text-sm h-96 overflow-y-auto border border-[hsl(var(--border))]" data-testid="docker-container-logs">
                {containerLogs.length === 0 ? (
                  <div className="text-[hsl(var(--foreground-muted))]">No logs available</div>
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

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Services Configuration */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Services</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddServiceForm(!showAddServiceForm)}
                  className="flex items-center gap-2 px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  Add Service
                </button>
                {composeServices.length > 0 && (
                  <button
                    onClick={handleClearCompose}
                    className="px-4 py-2 bg-[hsl(var(--danger))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Add Service Form */}
            {showAddServiceForm && (
              <div className="glass-card card-hover p-6 rounded-xl mb-4">
                <h3 className="text-lg font-bold mb-4 text-[hsl(var(--foreground))]">Add Service to Compose</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Service Name *</label>
                    <input
                      type="text"
                      value={newComposeService.name}
                      onChange={(e) => setNewComposeService({ ...newComposeService, name: e.target.value })}
                      placeholder="my-service"
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Image</label>
                    <input
                      type="text"
                      value={newComposeService.image || ''}
                      onChange={(e) => setNewComposeService({ ...newComposeService, image: e.target.value })}
                      placeholder="nginx:latest"
                      className="input-field w-full terminal-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Ports (one per line)</label>
                    <textarea
                      value={newComposeService.ports?.join('\n') || ''}
                      onChange={(e) => setNewComposeService({
                        ...newComposeService,
                        ports: e.target.value.split('\n').filter(p => p.trim())
                      })}
                      placeholder="8080:80&#10;443:443"
                      rows={3}
                      className="input-field w-full terminal-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Environment (KEY=value, one per line)</label>
                    <textarea
                      value={Object.entries(newComposeService.environment || {}).map(([k, v]) => `${k}=${v}`).join('\n')}
                      onChange={(e) => {
                        const env: Record<string, string> = {}
                        e.target.value.split('\n').forEach(line => {
                          const [key, ...valueParts] = line.split('=')
                          if (key.trim()) env[key.trim()] = valueParts.join('=').trim()
                        })
                        setNewComposeService({ ...newComposeService, environment: env })
                      }}
                      placeholder="NODE_ENV=production&#10;PORT=3000"
                      rows={3}
                      className="input-field w-full terminal-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">Volumes (one per line)</label>
                    <textarea
                      value={newComposeService.volumes?.join('\n') || ''}
                      onChange={(e) => setNewComposeService({
                        ...newComposeService,
                        volumes: e.target.value.split('\n').filter(v => v.trim())
                      })}
                      placeholder="./data:/app/data&#10;./logs:/app/logs"
                      rows={3}
                      className="input-field w-full terminal-text text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddComposeService}
                      className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl"
                    >
                      Add Service
                    </button>
                    <button
                      onClick={() => setShowAddServiceForm(false)}
                      className="px-4 py-2 bg-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-xl hover:opacity-80 transition-opacity"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Services List */}
            <div className="space-y-4">
              {composeServices.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--foreground-muted))] glass-card rounded-xl">
                  No services added yet. Click "Add Service" to get started.
                </div>
              ) : (
                composeServices.map((service, index) => (
                  <div key={index} className="glass-card card-hover p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-[hsl(var(--foreground))]">{service.name}</h3>
                        <div className="mt-2 text-sm text-[hsl(var(--foreground-muted))] space-y-1">
                          {service.image && <div className="terminal-text">Image: {service.image}</div>}
                          {service.ports && service.ports.length > 0 && (
                            <div className="terminal-text">Ports: {service.ports.join(', ')}</div>
                          )}
                          {service.volumes && service.volumes.length > 0 && (
                            <div>Volumes: {service.volumes.length}</div>
                          )}
                          {service.environment && Object.keys(service.environment).length > 0 && (
                            <div>Env Vars: {Object.keys(service.environment).length}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveComposeService(index)}
                        className="text-[hsl(var(--danger))] hover:opacity-80 transition-opacity"
                        title="Remove"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: YAML Preview and Actions */}
          <div>
            <div className="glass-card p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4 text-[hsl(var(--foreground))]">Docker Compose YAML</h2>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={handleGenerateCompose}
                  disabled={composeServices.length === 0}
                  className="px-4 py-2 bg-[hsl(var(--success))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate YAML
                </button>
                <button
                  onClick={handleDownloadCompose}
                  disabled={!generatedYaml}
                  className="px-4 py-2 btn-glow text-[hsl(var(--background))] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download
                </button>
                <label className="px-4 py-2 bg-[hsl(var(--info))] text-[hsl(var(--background))] rounded-xl hover:opacity-90 transition-opacity cursor-pointer">
                  Import File
                  <input
                    type="file"
                    accept=".yml,.yaml"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleImportCompose(file)
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* YAML Preview */}
              <div className="bg-[hsl(var(--background))] text-[hsl(var(--success))] p-4 rounded-xl terminal-text text-sm h-96 overflow-y-auto border border-[hsl(var(--border))]">
                {generatedYaml ? (
                  <pre className="whitespace-pre-wrap">{generatedYaml}</pre>
                ) : (
                  <div className="text-[hsl(var(--foreground-muted))]">
                    Add services and click "Generate YAML" to preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'image', id: null, name: '' })}
        onConfirm={confirmDialog.type === 'image' ? confirmRemoveImage : confirmRemoveContainer}
        title={`Delete ${confirmDialog.type === 'image' ? 'Image' : 'Container'}`}
        message={`Are you sure you want to remove ${confirmDialog.type === 'image' ? 'image' : 'container'} "${confirmDialog.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
