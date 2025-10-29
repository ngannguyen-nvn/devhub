import { DatabaseInstance } from '../db'
import type { ServiceTemplate, HealthCheck } from '@devhub/shared'
import * as fs from 'fs'
import * as path from 'path'

const db = DatabaseInstance.getInstance()

/**
 * TemplateManager - Manages service templates and auto-detection
 */
export class TemplateManager {
  /**
   * Built-in templates for common frameworks
   */
  private readonly BUILTIN_TEMPLATES: Omit<ServiceTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // Node.js Templates
    {
      name: 'Node.js - Express',
      description: 'Express.js REST API server',
      icon: '🟢',
      language: 'nodejs',
      framework: 'express',
      defaultCommand: 'npm run dev',
      defaultPort: 3000,
      defaultEnvVars: {
        NODE_ENV: 'development',
        PORT: '3000',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:3000/health',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['package.json', 'app.js', 'server.js'],
      isBuiltin: true,
    },
    {
      name: 'Node.js - Next.js',
      description: 'Next.js React framework',
      icon: '⬛',
      language: 'nodejs',
      framework: 'nextjs',
      defaultCommand: 'npm run dev',
      defaultPort: 3000,
      defaultEnvVars: {
        NODE_ENV: 'development',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:3000',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['package.json', 'next.config.js', 'pages/'],
      isBuiltin: true,
    },
    {
      name: 'Node.js - Nest.js',
      description: 'Nest.js progressive framework',
      icon: '🔴',
      language: 'nodejs',
      framework: 'nestjs',
      defaultCommand: 'npm run start:dev',
      defaultPort: 3000,
      defaultEnvVars: {
        NODE_ENV: 'development',
        PORT: '3000',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:3000',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['package.json', 'nest-cli.json'],
      isBuiltin: true,
    },
    {
      name: 'Node.js - Generic',
      description: 'Generic Node.js application',
      icon: '🟢',
      language: 'nodejs',
      defaultCommand: 'npm start',
      defaultPort: 3000,
      defaultEnvVars: {
        NODE_ENV: 'development',
      },
      detectFiles: ['package.json'],
      isBuiltin: true,
    },

    // Python Templates
    {
      name: 'Python - Django',
      description: 'Django web framework',
      icon: '🐍',
      language: 'python',
      framework: 'django',
      defaultCommand: 'python manage.py runserver',
      defaultPort: 8000,
      defaultEnvVars: {
        DJANGO_SETTINGS_MODULE: 'myproject.settings',
        DEBUG: 'True',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:8000',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['manage.py', 'settings.py', 'wsgi.py'],
      isBuiltin: true,
    },
    {
      name: 'Python - Flask',
      description: 'Flask micro web framework',
      icon: '🌶️',
      language: 'python',
      framework: 'flask',
      defaultCommand: 'flask run',
      defaultPort: 5000,
      defaultEnvVars: {
        FLASK_APP: 'app.py',
        FLASK_ENV: 'development',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:5000',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['app.py', 'requirements.txt'],
      isBuiltin: true,
    },
    {
      name: 'Python - FastAPI',
      description: 'FastAPI modern web framework',
      icon: '⚡',
      language: 'python',
      framework: 'fastapi',
      defaultCommand: 'uvicorn main:app --reload',
      defaultPort: 8000,
      defaultEnvVars: {
        PYTHONUNBUFFERED: '1',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:8000/docs',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['main.py', 'requirements.txt'],
      isBuiltin: true,
    },
    {
      name: 'Python - Generic',
      description: 'Generic Python application',
      icon: '🐍',
      language: 'python',
      defaultCommand: 'python app.py',
      defaultPort: 8000,
      detectFiles: ['requirements.txt', 'setup.py', 'pyproject.toml'],
      isBuiltin: true,
    },

    // Go Templates
    {
      name: 'Go - Web Server',
      description: 'Go HTTP server',
      icon: '🔵',
      language: 'go',
      defaultCommand: 'go run main.go',
      defaultPort: 8080,
      defaultEnvVars: {
        GO_ENV: 'development',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:8080',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['go.mod', 'main.go'],
      isBuiltin: true,
    },

    // Ruby Templates
    {
      name: 'Ruby - Rails',
      description: 'Ruby on Rails web framework',
      icon: '💎',
      language: 'ruby',
      framework: 'rails',
      defaultCommand: 'rails server',
      defaultPort: 3000,
      defaultEnvVars: {
        RAILS_ENV: 'development',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:3000',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['Gemfile', 'config.ru', 'config/application.rb'],
      isBuiltin: true,
    },
    {
      name: 'Ruby - Generic',
      description: 'Generic Ruby application',
      icon: '💎',
      language: 'ruby',
      defaultCommand: 'ruby app.rb',
      defaultPort: 4567,
      detectFiles: ['Gemfile'],
      isBuiltin: true,
    },

    // Java Templates
    {
      name: 'Java - Spring Boot',
      description: 'Spring Boot application',
      icon: '☕',
      language: 'java',
      framework: 'spring',
      defaultCommand: './mvnw spring-boot:run',
      defaultPort: 8080,
      defaultEnvVars: {
        SPRING_PROFILES_ACTIVE: 'dev',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:8080/actuator/health',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['pom.xml', 'build.gradle', 'application.properties'],
      isBuiltin: true,
    },

    // Rust Templates
    {
      name: 'Rust - Web Server',
      description: 'Rust web server (Actix/Rocket)',
      icon: '🦀',
      language: 'rust',
      defaultCommand: 'cargo run',
      defaultPort: 8080,
      defaultEnvVars: {
        RUST_LOG: 'debug',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:8080',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['Cargo.toml', 'src/main.rs'],
      isBuiltin: true,
    },

    // PHP Templates
    {
      name: 'PHP - Laravel',
      description: 'Laravel PHP framework',
      icon: '🐘',
      language: 'php',
      framework: 'laravel',
      defaultCommand: 'php artisan serve',
      defaultPort: 8000,
      defaultEnvVars: {
        APP_ENV: 'local',
        APP_DEBUG: 'true',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:8000',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['artisan', 'composer.json', 'bootstrap/app.php'],
      isBuiltin: true,
    },
    {
      name: 'PHP - Generic',
      description: 'Generic PHP application',
      icon: '🐘',
      language: 'php',
      defaultCommand: 'php -S localhost:8000',
      defaultPort: 8000,
      detectFiles: ['composer.json', 'index.php'],
      isBuiltin: true,
    },

    // .NET Templates
    {
      name: '.NET - ASP.NET Core',
      description: 'ASP.NET Core web application',
      icon: '🟣',
      language: 'dotnet',
      framework: 'aspnet',
      defaultCommand: 'dotnet run',
      defaultPort: 5000,
      defaultEnvVars: {
        ASPNETCORE_ENVIRONMENT: 'Development',
      },
      healthCheckConfig: {
        type: 'http',
        endpoint: 'http://localhost:5000/health',
        expectedStatus: 200,
        interval: 30,
        timeout: 5000,
        retries: 3,
        enabled: true,
      },
      detectFiles: ['*.csproj', 'Program.cs', 'Startup.cs'],
      isBuiltin: true,
    },
  ]

  /**
   * Initialize built-in templates in database
   */
  initializeBuiltinTemplates(): void {
    for (const template of this.BUILTIN_TEMPLATES) {
      const existing = db.prepare('SELECT id FROM service_templates WHERE name = ? AND is_builtin = 1')
        .get(template.name)

      if (!existing) {
        this.createTemplate(template)
      }
    }
  }

  /**
   * Create a new template
   */
  createTemplate(config: Omit<ServiceTemplate, 'id' | 'createdAt' | 'updatedAt'>): ServiceTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO service_templates (
        id, name, description, icon, language, framework,
        default_command, default_port, default_env_vars,
        health_check_config, detect_files, is_builtin
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      config.name,
      config.description || null,
      config.icon || null,
      config.language,
      config.framework || null,
      config.defaultCommand,
      config.defaultPort || null,
      config.defaultEnvVars ? JSON.stringify(config.defaultEnvVars) : null,
      config.healthCheckConfig ? JSON.stringify(config.healthCheckConfig) : null,
      JSON.stringify(config.detectFiles),
      config.isBuiltin ? 1 : 0
    )

    return {
      id,
      ...config,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * Get all templates
   */
  getAllTemplates(): ServiceTemplate[] {
    const stmt = db.prepare(`
      SELECT
        id,
        name,
        description,
        icon,
        language,
        framework,
        default_command as defaultCommand,
        default_port as defaultPort,
        default_env_vars as defaultEnvVars,
        health_check_config as healthCheckConfig,
        detect_files as detectFiles,
        is_builtin as isBuiltin,
        created_at as createdAt,
        updated_at as updatedAt
      FROM service_templates
      ORDER BY is_builtin DESC, name ASC
    `)

    const rows = stmt.all() as any[]
    return rows.map(row => ({
      ...row,
      defaultEnvVars: row.defaultEnvVars ? JSON.parse(row.defaultEnvVars) : undefined,
      healthCheckConfig: row.healthCheckConfig ? JSON.parse(row.healthCheckConfig) : undefined,
      detectFiles: JSON.parse(row.detectFiles),
      isBuiltin: Boolean(row.isBuiltin),
    }))
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ServiceTemplate | null {
    const stmt = db.prepare(`
      SELECT
        id,
        name,
        description,
        icon,
        language,
        framework,
        default_command as defaultCommand,
        default_port as defaultPort,
        default_env_vars as defaultEnvVars,
        health_check_config as healthCheckConfig,
        detect_files as detectFiles,
        is_builtin as isBuiltin,
        created_at as createdAt,
        updated_at as updatedAt
      FROM service_templates
      WHERE id = ?
    `)

    const row = stmt.get(id) as any
    if (!row) return null

    return {
      ...row,
      defaultEnvVars: row.defaultEnvVars ? JSON.parse(row.defaultEnvVars) : undefined,
      healthCheckConfig: row.healthCheckConfig ? JSON.parse(row.healthCheckConfig) : undefined,
      detectFiles: JSON.parse(row.detectFiles),
      isBuiltin: Boolean(row.isBuiltin),
    }
  }

  /**
   * Detect template from repository path
   */
  detectTemplate(repoPath: string): ServiceTemplate | null {
    const templates = this.getAllTemplates()

    // Score each template based on file matches
    const scores = templates.map(template => {
      let score = 0
      for (const detectFile of template.detectFiles) {
        const filePath = path.join(repoPath, detectFile)

        // Check if it's a directory pattern (ends with /)
        if (detectFile.endsWith('/')) {
          if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            score += 10
          }
        }
        // Check if it's a wildcard pattern (*.ext)
        else if (detectFile.includes('*')) {
          const dir = path.dirname(path.join(repoPath, detectFile))
          const pattern = path.basename(detectFile)

          if (fs.existsSync(dir)) {
            try {
              const files = fs.readdirSync(dir)
              const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
              if (files.some(f => regex.test(f))) {
                score += 10
              }
            } catch (error) {
              // Ignore read errors
            }
          }
        }
        // Regular file check
        else {
          if (fs.existsSync(filePath)) {
            score += 10
          }
        }
      }
      return { template, score }
    })

    // Get template with highest score
    if (scores.length === 0) return null

    const best = scores.reduce((prev, curr) => curr.score > prev.score ? curr : prev)

    return best.score > 0 ? best.template : null
  }

  /**
   * Update template
   */
  updateTemplate(id: string, updates: Partial<ServiceTemplate>): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?')
      values.push(updates.icon)
    }
    if (updates.language !== undefined) {
      fields.push('language = ?')
      values.push(updates.language)
    }
    if (updates.framework !== undefined) {
      fields.push('framework = ?')
      values.push(updates.framework)
    }
    if (updates.defaultCommand !== undefined) {
      fields.push('default_command = ?')
      values.push(updates.defaultCommand)
    }
    if (updates.defaultPort !== undefined) {
      fields.push('default_port = ?')
      values.push(updates.defaultPort)
    }
    if (updates.defaultEnvVars !== undefined) {
      fields.push('default_env_vars = ?')
      values.push(JSON.stringify(updates.defaultEnvVars))
    }
    if (updates.healthCheckConfig !== undefined) {
      fields.push('health_check_config = ?')
      values.push(JSON.stringify(updates.healthCheckConfig))
    }
    if (updates.detectFiles !== undefined) {
      fields.push('detect_files = ?')
      values.push(JSON.stringify(updates.detectFiles))
    }

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE service_templates SET ${fields.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)

    return result.changes > 0
  }

  /**
   * Delete template (only custom templates, not built-in)
   */
  deleteTemplate(id: string): boolean {
    const stmt = db.prepare('DELETE FROM service_templates WHERE id = ? AND is_builtin = 0')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Get templates by language
   */
  getTemplatesByLanguage(language: string): ServiceTemplate[] {
    const stmt = db.prepare(`
      SELECT
        id,
        name,
        description,
        icon,
        language,
        framework,
        default_command as defaultCommand,
        default_port as defaultPort,
        default_env_vars as defaultEnvVars,
        health_check_config as healthCheckConfig,
        detect_files as detectFiles,
        is_builtin as isBuiltin,
        created_at as createdAt,
        updated_at as updatedAt
      FROM service_templates
      WHERE language = ?
      ORDER BY is_builtin DESC, name ASC
    `)

    const rows = stmt.all(language) as any[]
    return rows.map(row => ({
      ...row,
      defaultEnvVars: row.defaultEnvVars ? JSON.parse(row.defaultEnvVars) : undefined,
      healthCheckConfig: row.healthCheckConfig ? JSON.parse(row.healthCheckConfig) : undefined,
      detectFiles: JSON.parse(row.detectFiles),
      isBuiltin: Boolean(row.isBuiltin),
    }))
  }
}

export const templateManager = new TemplateManager()

// Initialize built-in templates on module load
templateManager.initializeBuiltinTemplates()
