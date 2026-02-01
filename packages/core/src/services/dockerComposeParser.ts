import fs from 'fs/promises'
import path from 'path'
import yaml from 'js-yaml'

export interface ComposeService {
  name: string
  image?: string
  build?: {
    context: string
    dockerfile?: string
  }
  ports?: string[]
  environment?: Record<string, string>
  volumes?: string[]
  depends_on?: string[]
  command?: string
  working_dir?: string
  restart?: string
  networks?: string[]
}

export interface ComposeFile {
  version?: string
  services: Record<string, any>
  networks?: Record<string, any>
  volumes?: Record<string, any>
}

export interface ParsedCompose {
  filePath: string
  fileName: string
  version: string
  services: ComposeService[]
  networks: string[]
  volumes: string[]
  rawContent: string
}

/**
 * DockerComposeParser - Parses docker-compose.yml files and extracts service configurations
 */
export class DockerComposeParser {
  /**
   * Parse a docker-compose file and extract service information
   */
  async parseFile(filePath: string): Promise<ParsedCompose | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const compose = yaml.load(content) as ComposeFile

      if (!compose || typeof compose !== 'object') {
        throw new Error('Invalid docker-compose file format')
      }

      const services = this.extractServices(compose, path.dirname(filePath))
      const networks = this.extractNetworks(compose)
      const volumes = this.extractVolumes(compose)

      return {
        filePath,
        fileName: path.basename(filePath),
        version: compose.version || '3.8',
        services,
        networks,
        volumes,
        rawContent: content,
      }
    } catch (error) {
      console.error(`Error parsing docker-compose file ${filePath}:`, error)
      return null
    }
  }

  /**
   * Extract services from compose file
   */
  private extractServices(compose: ComposeFile, basePath: string): ComposeService[] {
    const services: ComposeService[] = []

    if (!compose.services || typeof compose.services !== 'object') {
      return services
    }

    for (const [name, config] of Object.entries(compose.services)) {
      const service: ComposeService = {
        name,
      }

      // Image or build
      if (config.image) {
        service.image = config.image
      }

      if (config.build) {
        if (typeof config.build === 'string') {
          service.build = {
            context: config.build,
            dockerfile: 'Dockerfile',
          }
        } else if (typeof config.build === 'object') {
          service.build = {
            context: config.build.context || '.',
            dockerfile: config.build.dockerfile || 'Dockerfile',
          }
        }
      }

      // Ports
      if (config.ports && Array.isArray(config.ports)) {
        service.ports = config.ports.map((port: any) => {
          if (typeof port === 'string') return port
          if (typeof port === 'object' && port.target) {
            return `${port.published || port.target}:${port.target}`
          }
          return String(port)
        })
      }

      // Environment variables
      if (config.environment) {
        if (typeof config.environment === 'object' && !Array.isArray(config.environment)) {
          service.environment = config.environment
        } else if (Array.isArray(config.environment)) {
          service.environment = {}
          config.environment.forEach((env: string) => {
            const [key, value] = env.split('=')
            if (key) {
              service.environment![key] = value || ''
            }
          })
        }
      }

      // Volumes
      if (config.volumes && Array.isArray(config.volumes)) {
        service.volumes = config.volumes.map((vol: any) => {
          if (typeof vol === 'string') return vol
          if (typeof vol === 'object') {
            return `${vol.source || vol.type}:${vol.target || ''}${vol.read_only ? ':ro' : ''}`
          }
          return String(vol)
        })
      }

      // Depends on
      if (config.depends_on) {
        if (Array.isArray(config.depends_on)) {
          service.depends_on = config.depends_on
        } else if (typeof config.depends_on === 'object') {
          service.depends_on = Object.keys(config.depends_on)
        }
      }

      // Command
      if (config.command) {
        if (typeof config.command === 'string') {
          service.command = config.command
        } else if (Array.isArray(config.command)) {
          service.command = config.command.join(' ')
        }
      }

      // Working directory
      if (config.working_dir) {
        service.working_dir = config.working_dir
      }

      // Restart policy
      if (config.restart) {
        service.restart = config.restart
      }

      // Networks
      if (config.networks) {
        if (Array.isArray(config.networks)) {
          service.networks = config.networks
        } else if (typeof config.networks === 'object') {
          service.networks = Object.keys(config.networks)
        }
      }

      services.push(service)
    }

    return services
  }

  /**
   * Extract networks from compose file
   */
  private extractNetworks(compose: ComposeFile): string[] {
    if (!compose.networks || typeof compose.networks !== 'object') {
      return []
    }
    return Object.keys(compose.networks)
  }

  /**
   * Extract volumes from compose file
   */
  private extractVolumes(compose: ComposeFile): string[] {
    if (!compose.volumes || typeof compose.volumes !== 'object') {
      return []
    }
    return Object.keys(compose.volumes)
  }

  /**
   * Convert compose service to DevHub service format
   */
  convertToDevHubService(composeService: ComposeService, repoPath: string): any {
    return {
      name: composeService.name,
      repoPath: repoPath,
      command: composeService.command || (composeService.image 
        ? `docker run ${composeService.ports?.map(p => `-p ${p}`).join(' ') || ''} ${composeService.image}`
        : 'echo "No command specified"'),
      port: composeService.ports?.[0]?.split(':')?.[0],
      envVars: composeService.environment || {},
    }
  }

  /**
   * Save docker-compose content to file
   */
  async saveFile(filePath: string, content: string): Promise<boolean> {
    try {
      await fs.writeFile(filePath, content, 'utf-8')
      return true
    } catch (error) {
      console.error(`Error saving docker-compose file ${filePath}:`, error)
      return false
    }
  }

  /**
   * Validate docker-compose YAML content
   */
  validateContent(content: string): { valid: boolean; error?: string } {
    try {
      const parsed = yaml.load(content) as ComposeFile | null
      
      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: 'Invalid YAML structure' }
      }

      if (!parsed.services || Object.keys(parsed.services).length === 0) {
        return { valid: false, error: 'No services defined in compose file' }
      }

      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }
}

export const dockerComposeParser = new DockerComposeParser()
