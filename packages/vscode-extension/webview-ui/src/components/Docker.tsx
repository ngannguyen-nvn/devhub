/**
 * Docker Management Component
 *
 * Features:
 * - Images tab: list, build, remove, run
 * - Containers tab: list, start, stop, remove, logs
 * - Compose tab: generate docker-compose.yml
 * - SSE streaming for build logs
 * - Real-time container status updates
 */

import { useState, useEffect } from 'react'
import * as yaml from 'js-yaml'
import { dockerApi } from '../messaging/vscodeApi'
import '../styles/Docker.css'

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
  command?: string
  restart?: string
}

export default function Docker() {
  const [activeTab, setActiveTab] = useState<'images' | 'containers' | 'compose'>('images')
  const [images, setImages] = useState<DockerImage[]>([])
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [loading, setLoading] = useState(false)
  const [dockerAvailable, setDockerAvailable] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null)
  const [containerLogs, setContainerLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

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
      const response = await dockerApi.ping()
      setDockerAvailable(response.available)
    } catch (err) {
      console.error('[Docker] Error checking availability:', err)
      setDockerAvailable(false)
    }
  }

  // Fetch images
  const fetchImages = async () => {
    if (!dockerAvailable) return
    setLoading(true)
    try {
      const response = await dockerApi.listImages()
      setImages(response.images || [])
    } catch (err) {
      console.error('[Docker] Error fetching images:', err)
      setError('Failed to fetch images')
    } finally {
      setLoading(false)
    }
  }

  // Fetch containers
  const fetchContainers = async () => {
    if (!dockerAvailable) return
    setLoading(true)
    try {
      const response = await dockerApi.listContainers()
      setContainers(response.containers || [])
    } catch (err) {
      console.error('[Docker] Error fetching containers:', err)
      setError('Failed to fetch containers')
    } finally {
      setLoading(false)
    }
  }

  // Fetch container logs
  const fetchContainerLogs = async (containerId: string) => {
    try {
      const response = await dockerApi.getContainerLogs(containerId)
      setContainerLogs(response.logs || [])
    } catch (err) {
      console.error('[Docker] Error fetching logs:', err)
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
      } else if (activeTab === 'containers') {
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
      setError('Context path and tag are required')
      return
    }

    setBuilding(true)
    setBuildLogs([])

    try {
      await dockerApi.buildImageStream(
        buildForm,
        (log) => {
          // On progress - add log line
          setBuildLogs((prev) => [...prev, log])
        },
        (success, error) => {
          // On complete
          setBuilding(false)
          if (success) {
            setShowBuildForm(false)
            setBuildForm({ contextPath: '', dockerfilePath: 'Dockerfile', tag: '' })
            fetchImages()
          } else {
            setError(error || 'Build failed')
          }
        }
      )
    } catch (err) {
      console.error('[Docker] Build error:', err)
      setError(err instanceof Error ? err.message : 'Build failed')
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
      await dockerApi.removeImage(confirmDialog.id)
      fetchImages()
      setConfirmDialog({ isOpen: false, type: 'image', id: null, name: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image')
    }
  }

  // Run container
  const handleRunContainer = async () => {
    if (!runForm.imageName || !runForm.containerName) {
      setError('Image name and container name are required')
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

      await dockerApi.runContainer({
        imageName: runForm.imageName,
        containerName: runForm.containerName,
        ports,
        env,
      })

      setShowRunForm(false)
      setRunForm({ imageName: '', containerName: '', ports: '', env: '' })
      fetchContainers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run container')
    }
  }

  // Start container
  const handleStartContainer = async (containerId: string) => {
    try {
      await dockerApi.startContainer(containerId)
      fetchContainers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start container')
    }
  }

  // Stop container
  const handleStopContainer = async (containerId: string) => {
    try {
      await dockerApi.stopContainer(containerId)
      fetchContainers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop container')
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
      await dockerApi.removeContainer(confirmDialog.id)
      if (selectedContainer === confirmDialog.id) {
        setSelectedContainer(null)
      }
      fetchContainers()
      setConfirmDialog({ isOpen: false, type: 'container', id: null, name: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove container')
    }
  }

  // Docker Compose handlers
  const handleAddComposeService = () => {
    if (!newComposeService.name) {
      setError('Service name is required')
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
    setGeneratedYaml('')
  }

  const handleRunComposeService = async (service: ComposeService) => {
    // Validate that service has either image or build
    if (!service.image && !service.build) {
      setError(`Service "${service.name}" must have either an image or a build context to run`)
      return
    }

    try {
      // Create service config conditionally - only add fields that exist
      const serviceConfig: any = {}
      if (service.image) serviceConfig.image = service.image
      if (service.build) serviceConfig.build = service.build
      if (service.ports && service.ports.length > 0) serviceConfig.ports = service.ports
      if (service.environment && Object.keys(service.environment).length > 0) serviceConfig.environment = service.environment
      if (service.volumes && service.volumes.length > 0) serviceConfig.volumes = service.volumes
      if (service.dependsOn && service.dependsOn.length > 0) serviceConfig.depends_on = service.dependsOn
      if (service.command) serviceConfig.command = service.command
      if (service.restart) serviceConfig.restart = service.restart

      // Create a temporary compose file with just this service
      const singleServiceCompose = {
        version: '3.8',
        services: {
          [service.name]: serviceConfig
        }
      }

      // Convert to YAML using js-yaml
      const yamlContent = yaml.dump(singleServiceCompose, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      })

      // Save to temp file
      const tempFileName = `temp-${service.name}-${Date.now()}.yml`
      const response = await dockerApi.saveCompose(`/tmp/${tempFileName}`, yamlContent)

      if (response.success) {
        // Run the service
        const runResponse = await dockerApi.composeUp(`/tmp/${tempFileName}`, {
          services: [service.name]
        })

        if (runResponse.success) {
          setError(`Service "${service.name}" started successfully`)
        } else {
          setError(`Failed to start service: ${runResponse.error}${runResponse.errorOutput ? '\n\n' + runResponse.errorOutput : ''}`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run service')
    }
  }

  const handleBuildComposeImage = async (service: ComposeService) => {
    // Check if service has build context
    if (!service.build || !service.build.context) {
      setError(`Service "${service.name}" must have a build context to build an image`)
      return
    }

    setBuilding(true)
    setBuildLogs([])

    try {
      // Use service name as tag if not specified
      const tag = service.image || `${service.name}:latest`

      await dockerApi.buildImageStream(
        {
          contextPath: service.build.context,
          dockerfilePath: service.build.dockerfile || 'Dockerfile',
          tag: tag,
        },
        (log) => {
          // On progress - add log line
          setBuildLogs((prev) => [...prev, log])
        },
        (success, error) => {
          // On complete
          setBuilding(false)
          if (success) {
            setError(`Image for service "${service.name}" built successfully`)
            fetchImages()
          } else {
            setError(error || `Failed to build image for service "${service.name}"`)
          }
        }
      )
    } catch (err) {
      console.error('[Docker] Build error:', err)
      setError(err instanceof Error ? err.message : 'Build failed')
      setBuilding(false)
    }
  }

  const handleRemoveComposeService = (index: number) => {
    setComposeServices(composeServices.filter((_, i) => i !== index))
    setGeneratedYaml('')
  }

  const handleGenerateCompose = async () => {
    if (composeServices.length === 0) {
      setError('Add at least one service to generate compose file')
      return
    }

    try {
      const response = await dockerApi.generateCompose({ services: composeServices })
      setGeneratedYaml(response.yaml)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate compose')
    }
  }

  const handleDownloadCompose = () => {
    if (!generatedYaml) {
      setError('Generate YAML first')
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
  }

  const handleClearCompose = () => {
    setComposeServices([])
    setGeneratedYaml('')
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
      <div className="docker">
        <div className="docker-unavailable">
          <h3>Docker Not Available</h3>
          <p>Docker is not running or not installed. Please start Docker and refresh.</p>
          <button className="btn-primary" onClick={checkDocker}>
            Check Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="docker">
      <div className="docker-header">
        <h2>Docker Management</h2>
        <button
          className="btn-secondary"
          onClick={() => activeTab === 'images' ? fetchImages() : fetchContainers()}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="docker-tabs">
        <button
          className={`tab ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          Images ({images.length})
        </button>
        <button
          className={`tab ${activeTab === 'containers' ? 'active' : ''}`}
          onClick={() => setActiveTab('containers')}
        >
          Containers ({containers.length})
        </button>
        <button
          className={`tab ${activeTab === 'compose' ? 'active' : ''}`}
          onClick={() => setActiveTab('compose')}
        >
          Compose
        </button>
      </div>

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div className="images-tab">
          <div className="tab-actions">
            <button
              className="btn-primary"
              onClick={() => setShowBuildForm(!showBuildForm)}
            >
              + Build Image
            </button>
          </div>

          {/* Build Form */}
          {showBuildForm && (
            <div className="build-form">
              <h3>Build Docker Image</h3>
              <div className="form-group">
                <label>Context Path</label>
                <input
                  type="text"
                  value={buildForm.contextPath}
                  onChange={(e) => setBuildForm({ ...buildForm, contextPath: e.target.value })}
                  placeholder="/path/to/project"
                />
              </div>
              <div className="form-group">
                <label>Dockerfile Path</label>
                <input
                  type="text"
                  value={buildForm.dockerfilePath}
                  onChange={(e) => setBuildForm({ ...buildForm, dockerfilePath: e.target.value })}
                  placeholder="Dockerfile"
                />
              </div>
              <div className="form-group">
                <label>Image Tag</label>
                <input
                  type="text"
                  value={buildForm.tag}
                  onChange={(e) => setBuildForm({ ...buildForm, tag: e.target.value })}
                  placeholder="my-app:latest"
                />
              </div>

              {building && buildLogs.length > 0 && (
                <div className="build-logs">
                  {buildLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}

              <div className="form-actions">
                <button
                  className="btn-primary"
                  onClick={handleBuildImage}
                  disabled={building}
                >
                  {building ? 'Building...' : 'Build'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setShowBuildForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Images List */}
          <div className="images-list">
            {loading && images.length === 0 ? (
              <div className="empty-state">Loading images...</div>
            ) : images.length === 0 ? (
              <div className="empty-state">No Docker images found</div>
            ) : (
              images.map(image => (
                <div key={image.id} className="image-card">
                  <div className="image-header">
                    <h3>{image.repoTags[0] || 'Unknown'}</h3>
                    <button
                      className="btn-danger-small"
                      onClick={() => handleRemoveImage(image.id, image.repoTags[0] || 'Unknown')}
                      title="Remove Image"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="image-details">
                    <div className="detail-row">
                      <span className="label">ID:</span>
                      <span className="value">{image.id.substring(0, 12)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Size:</span>
                      <span className="value">{formatBytes(image.size)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Created:</span>
                      <span className="value">{formatDate(image.created)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Containers Tab */}
      {activeTab === 'containers' && (
        <div className="containers-tab">
          <div className="containers-grid">
            {/* Containers List */}
            <div className="containers-list-section">
              <div className="tab-actions">
                <button
                  className="btn-success"
                  onClick={() => setShowRunForm(!showRunForm)}
                >
                  + Run Container
                </button>
              </div>

              {/* Run Form */}
              {showRunForm && (
                <div className="run-form">
                  <h3>Run New Container</h3>
                  <div className="form-group">
                    <label>Image Name</label>
                    <input
                      type="text"
                      value={runForm.imageName}
                      onChange={(e) => setRunForm({ ...runForm, imageName: e.target.value })}
                      placeholder="nginx:latest"
                    />
                  </div>
                  <div className="form-group">
                    <label>Container Name</label>
                    <input
                      type="text"
                      value={runForm.containerName}
                      onChange={(e) => setRunForm({ ...runForm, containerName: e.target.value })}
                      placeholder="my-container"
                    />
                  </div>
                  <div className="form-group">
                    <label>Port Mappings</label>
                    <input
                      type="text"
                      value={runForm.ports}
                      onChange={(e) => setRunForm({ ...runForm, ports: e.target.value })}
                      placeholder="80:8080, 443:8443"
                    />
                  </div>
                  <div className="form-group">
                    <label>Environment Variables</label>
                    <input
                      type="text"
                      value={runForm.env}
                      onChange={(e) => setRunForm({ ...runForm, env: e.target.value })}
                      placeholder="KEY=value, FOO=bar"
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn-success"
                      onClick={handleRunContainer}
                    >
                      Run
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowRunForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Containers List */}
              <div className="containers-list">
                {loading && containers.length === 0 ? (
                  <div className="empty-state">Loading containers...</div>
                ) : containers.length === 0 ? (
                  <div className="empty-state">No containers found</div>
                ) : (
                  containers.map(container => (
                    <div
                      key={container.id}
                      onClick={() => setSelectedContainer(container.id)}
                      className={`container-card ${container.state === 'running' ? 'running' : ''} ${
                        selectedContainer === container.id ? 'selected' : ''
                      }`}
                    >
                      <div className="container-header">
                        <div>
                          <h3>{container.name}</h3>
                          <span className={`status-badge ${container.state}`}>
                            {container.state}
                          </span>
                        </div>
                        <div className="container-actions">
                          {container.state === 'running' ? (
                            <button
                              className="btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStopContainer(container.id)
                              }}
                              title="Stop"
                            >
                              Stop
                            </button>
                          ) : (
                            <button
                              className="btn-success"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartContainer(container.id)
                              }}
                              title="Start"
                            >
                              Start
                            </button>
                          )}
                          <button
                            className="btn-danger-small"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveContainer(container.id, container.name)
                            }}
                            title="Remove"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="container-details">
                        <div className="detail-row">
                          <span className="label">Image:</span>
                          <span className="value">{container.image}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">ID:</span>
                          <span className="value">{container.id.substring(0, 12)}</span>
                        </div>
                        {container.ports.length > 0 && (
                          <div className="detail-row">
                            <span className="label">Ports:</span>
                            <span className="value">
                              {container.ports.map(p =>
                                p.publicPort ? `${p.publicPort}:${p.privatePort}` : p.privatePort
                              ).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Container Logs */}
            {selectedContainer && (
              <div className="docker-logs-panel">
                <div className="logs-header">
                  <h3>Container Logs</h3>
                  <button onClick={() => fetchContainerLogs(selectedContainer)}>
                    Refresh
                  </button>
                </div>
                <div className="logs-content">
                  {containerLogs.length === 0 ? (
                    <div className="logs-empty">No logs available</div>
                  ) : (
                    containerLogs.map((log, i) => (
                      <div key={i} className="log-line">{log}</div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="compose-tab">
          <div className="compose-grid">
            {/* Left: Services Configuration */}
            <div className="compose-services">
              <div className="compose-header">
                <h3>Services</h3>
                <div className="compose-actions">
                  <button
                    className="btn-primary"
                    onClick={() => setShowAddServiceForm(!showAddServiceForm)}
                  >
                    + Add Service
                  </button>
                  {composeServices.length > 0 && (
                    <button
                      className="btn-danger"
                      onClick={handleClearCompose}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Add Service Form */}
              {showAddServiceForm && (
                <div className="service-form">
                  <h4>Add Service to Compose</h4>
                  <div className="form-group">
                    <label>Service Name *</label>
                    <input
                      type="text"
                      value={newComposeService.name}
                      onChange={(e) => setNewComposeService({ ...newComposeService, name: e.target.value })}
                      placeholder="my-service"
                    />
                  </div>
                  <div className="form-group">
                    <label>Image</label>
                    <input
                      type="text"
                      value={newComposeService.image || ''}
                      onChange={(e) => setNewComposeService({ ...newComposeService, image: e.target.value })}
                      placeholder="nginx:latest"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ports (one per line)</label>
                    <textarea
                      value={newComposeService.ports?.join('\n') || ''}
                      onChange={(e) => setNewComposeService({
                        ...newComposeService,
                        ports: e.target.value.split('\n').filter(p => p.trim())
                      })}
                      placeholder="8080:80&#10;443:443"
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>Environment (KEY=value, one per line)</label>
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
                    />
                  </div>
                  <div className="form-group">
                    <label>Volumes (one per line)</label>
                    <textarea
                      value={newComposeService.volumes?.join('\n') || ''}
                      onChange={(e) => setNewComposeService({
                        ...newComposeService,
                        volumes: e.target.value.split('\n').filter(v => v.trim())
                      })}
                      placeholder="./data:/app/data&#10;./logs:/app/logs"
                      rows={3}
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn-primary"
                      onClick={handleAddComposeService}
                    >
                      Add Service
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowAddServiceForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Services List */}
              <div className="services-list">
                {composeServices.length === 0 ? (
                  <div className="empty-state">
                    No services added yet. Click "Add Service" to get started.
                  </div>
                ) : (
                composeServices.map((service, index) => (
                  <div key={index} className="compose-service-card">
                    <div className="service-header">
                      <h4>{service.name}</h4>
                      <div className="service-actions">
                        {service.build && (
                          <button
                            className="btn-primary-small"
                            onClick={() => handleBuildComposeImage(service)}
                            disabled={building}
                            title="Build Image"
                          >
                            Build
                          </button>
                        )}
                        <button
                          className="btn-success-small"
                          onClick={() => handleRunComposeService(service)}
                          title="Run Service"
                        >
                          Run
                        </button>
                        <button
                          className="btn-danger-small"
                          onClick={() => handleRemoveComposeService(index)}
                          title="Remove"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                      <div className="service-details">
                        {service.image && (
                          <div className="detail-row">
                            <span className="label">Image:</span>
                            <span className="value">{service.image}</span>
                          </div>
                        )}
                        {service.ports && service.ports.length > 0 && (
                          <div className="detail-row">
                            <span className="label">Ports:</span>
                            <span className="value">{service.ports.join(', ')}</span>
                          </div>
                        )}
                        {service.volumes && service.volumes.length > 0 && (
                          <div className="detail-row">
                            <span className="label">Volumes:</span>
                            <span className="value">{service.volumes.length}</span>
                          </div>
                        )}
                        {service.environment && Object.keys(service.environment).length > 0 && (
                          <div className="detail-row">
                            <span className="label">Env Vars:</span>
                            <span className="value">{Object.keys(service.environment).length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Build Logs - Shows during image build */}
            {building && (
              <div className="compose-build-logs">
                <div className="build-logs-header">
                  <h3>Building Image...</h3>
                  <span className="loading-indicator"></span>
                </div>
                <div className="build-logs-content">
                  {buildLogs.length === 0 ? (
                    <div className="build-logs-empty">Starting build...</div>
                  ) : (
                    buildLogs.map((log, i) => (
                      <div key={i} className="build-log-line">{log}</div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Right: YAML Preview and Actions */}
            <div className="compose-preview">
              <h3>Docker Compose YAML</h3>

              {/* Action Buttons */}
              <div className="compose-yaml-actions">
                <button
                  className="btn-success"
                  onClick={handleGenerateCompose}
                  disabled={composeServices.length === 0}
                >
                  Generate YAML
                </button>
                <button
                  className="btn-primary"
                  onClick={handleDownloadCompose}
                  disabled={!generatedYaml}
                >
                  Download
                </button>
              </div>

              {/* YAML Preview */}
              <div className="yaml-preview">
                {generatedYaml ? (
                  <pre>{generatedYaml}</pre>
                ) : (
                  <div className="yaml-empty">
                    Add services and click "Generate YAML" to preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog({ isOpen: false, type: 'image', id: null, name: '' })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {confirmDialog.type === 'image' ? 'Image' : 'Container'}</h3>
            <p>
              Are you sure you want to remove {confirmDialog.type === 'image' ? 'image' : 'container'} "{confirmDialog.name}"?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDialog({ isOpen: false, type: 'image', id: null, name: '' })}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={confirmDialog.type === 'image' ? confirmRemoveImage : confirmRemoveContainer}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
