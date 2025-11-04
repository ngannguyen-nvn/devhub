import Docker from 'dockerode'
import { EventEmitter } from 'events'
import { DockerImage, DockerContainer } from '@devhub/shared'
import * as fs from 'fs'
import * as path from 'path'

export class DockerManager extends EventEmitter {
  private docker: Docker

  constructor() {
    super()
    this.docker = new Docker()
  }

  /**
   * Test Docker connection
   */
  async ping(): Promise<boolean> {
    try {
      await this.docker.ping()
      return true
    } catch (error) {
      console.error('Docker connection failed:', error)
      return false
    }
  }

  /**
   * Get Docker info
   */
  async getInfo(): Promise<any> {
    try {
      return await this.docker.info()
    } catch (error) {
      console.error('Failed to get Docker info:', error)
      throw new Error('Docker is not available')
    }
  }

  /**
   * List all Docker images
   */
  async listImages(): Promise<DockerImage[]> {
    try {
      const images = await this.docker.listImages()

      return images.map(img => ({
        id: img.Id.substring(7, 19), // Short ID
        repoTags: img.RepoTags || ['<none>:<none>'],
        size: img.Size,
        created: img.Created,
        containers: img.Containers || 0,
      }))
    } catch (error) {
      console.error('Failed to list images:', error)
      throw new Error('Failed to list Docker images')
    }
  }

  /**
   * Build Docker image from Dockerfile
   */
  async buildImage(
    contextPath: string,
    dockerfilePath: string,
    tag: string,
    onProgress?: (progress: any) => void
  ): Promise<void> {
    try {
      // Verify Dockerfile exists
      const fullDockerfilePath = path.join(contextPath, dockerfilePath)
      if (!fs.existsSync(fullDockerfilePath)) {
        throw new Error(`Dockerfile not found at ${fullDockerfilePath}`)
      }

      console.log(`Building image ${tag} from ${contextPath}`)

      const stream = await this.docker.buildImage(
        {
          context: contextPath,
          src: [dockerfilePath, '.'],
        },
        {
          t: tag,
          dockerfile: dockerfilePath,
        }
      )

      // Stream build output
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(
          stream,
          (err, res) => (err ? reject(err) : resolve(res)),
          (event) => {
            if (onProgress) {
              onProgress(event)
            }
            if (event.stream) {
              console.log(event.stream.trim())
            }
            if (event.error) {
              console.error('Build error:', event.error)
            }
          }
        )
      })

      console.log(`Successfully built image ${tag}`)
    } catch (error: any) {
      console.error('Failed to build image:', error)
      throw new Error(`Failed to build image: ${error.message}`)
    }
  }

  /**
   * Remove Docker image
   */
  async removeImage(imageId: string, force: boolean = false): Promise<void> {
    try {
      const image = this.docker.getImage(imageId)
      await image.remove({ force })
      console.log(`Removed image ${imageId}`)
    } catch (error: any) {
      console.error('Failed to remove image:', error)
      throw new Error(`Failed to remove image: ${error.message}`)
    }
  }

  /**
   * List all Docker containers
   */
  async listContainers(all: boolean = false): Promise<DockerContainer[]> {
    try {
      const containers = await this.docker.listContainers({ all })

      return containers.map(container => ({
        id: container.Id.substring(0, 12),
        name: container.Names[0].replace(/^\//, ''),
        image: container.Image,
        state: container.State,
        status: container.Status,
        ports: container.Ports.map(p => ({
          privatePort: p.PrivatePort,
          publicPort: p.PublicPort,
          type: p.Type,
        })),
        created: container.Created,
      }))
    } catch (error) {
      console.error('Failed to list containers:', error)
      throw new Error('Failed to list Docker containers')
    }
  }

  /**
   * Run a Docker container
   */
  async runContainer(
    imageName: string,
    containerName: string,
    options: {
      ports?: Record<string, string>
      env?: string[]
      volumes?: string[]
      command?: string[]
    } = {}
  ): Promise<string> {
    try {
      console.log(`Running container ${containerName} from image ${imageName}`)

      const portBindings: any = {}
      const exposedPorts: any = {}

      if (options.ports) {
        Object.entries(options.ports).forEach(([containerPort, hostPort]) => {
          const key = `${containerPort}/tcp`
          exposedPorts[key] = {}
          portBindings[key] = [{ HostPort: hostPort }]
        })
      }

      const container = await this.docker.createContainer({
        Image: imageName,
        name: containerName,
        Env: options.env || [],
        ExposedPorts: exposedPorts,
        HostConfig: {
          PortBindings: portBindings,
          Binds: options.volumes || [],
        },
        Cmd: options.command,
      })

      await container.start()
      console.log(`Started container ${containerName} (ID: ${container.id})`)

      return container.id
    } catch (error: any) {
      console.error('Failed to run container:', error)
      throw new Error(`Failed to run container: ${error.message}`)
    }
  }

  /**
   * Start a stopped container
   */
  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId)
      await container.start()
      console.log(`Started container ${containerId}`)
    } catch (error: any) {
      console.error('Failed to start container:', error)
      throw new Error(`Failed to start container: ${error.message}`)
    }
  }

  /**
   * Stop a running container
   */
  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId)
      await container.stop()
      console.log(`Stopped container ${containerId}`)
    } catch (error: any) {
      console.error('Failed to stop container:', error)
      throw new Error(`Failed to stop container: ${error.message}`)
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId)
      await container.remove({ force })
      console.log(`Removed container ${containerId}`)
    } catch (error: any) {
      console.error('Failed to remove container:', error)
      throw new Error(`Failed to remove container: ${error.message}`)
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerId: string, tail: number = 100): Promise<string[]> {
    try {
      const container = this.docker.getContainer(containerId)
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: false,
      })

      // Parse logs (dockerode returns buffer with headers)
      const logString = logs.toString('utf8')
      return logString
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Remove Docker log headers (8 bytes)
          if (line.length > 8) {
            return line.substring(8)
          }
          return line
        })
    } catch (error: any) {
      console.error('Failed to get container logs:', error)
      throw new Error(`Failed to get container logs: ${error.message}`)
    }
  }

  /**
   * Generate docker-compose.yml content
   */
  generateDockerCompose(services: Array<{
    name: string
    image?: string
    build?: {
      context: string
      dockerfile: string
    }
    dockerfile?: string
    context?: string
    ports?: string[]
    environment?: Record<string, string>
    volumes?: string[]
    dependsOn?: string[]
  }>): string {
    const compose: any = {
      version: '3.8',
      services: {},
    }

    services.forEach(service => {
      const serviceConfig: any = {}

      if (service.image) {
        serviceConfig.image = service.image
      } else if (service.build) {
        serviceConfig.build = {
          context: service.build.context,
          dockerfile: service.build.dockerfile,
        }
      } else if (service.dockerfile && service.context) {
        serviceConfig.build = {
          context: service.context,
          dockerfile: service.dockerfile,
        }
      }

      if (service.ports && service.ports.length > 0) {
        serviceConfig.ports = service.ports
      }

      if (service.environment) {
        serviceConfig.environment = service.environment
      }

      if (service.volumes && service.volumes.length > 0) {
        serviceConfig.volumes = service.volumes
      }

      if (service.dependsOn && service.dependsOn.length > 0) {
        serviceConfig.depends_on = service.dependsOn
      }

      compose.services[service.name] = serviceConfig
    })

    // Convert to YAML-like format (simple implementation)
    return this.objectToYaml(compose)
  }

  /**
   * Simple object to YAML converter
   */
  private objectToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent)
    let yaml = ''

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`
        yaml += this.objectToYaml(value, indent + 1)
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`
            yaml += this.objectToYaml(item, indent + 2)
          } else {
            yaml += `${spaces}  - ${item}\n`
          }
        })
      } else {
        yaml += `${spaces}${key}: ${value}\n`
      }
    }

    return yaml
  }
}
