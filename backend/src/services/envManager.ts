import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import db from '../db'
import { EnvProfile, EnvVariable } from '@devhub/shared'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

export class EnvManager {
  private encryptionKey: Buffer

  constructor(masterPassword?: string) {
    // Generate or derive encryption key
    // In production, this should come from environment or secure key storage
    const password = masterPassword || process.env.DEVHUB_MASTER_KEY || 'devhub-default-key-change-in-production'
    this.encryptionKey = crypto.scryptSync(password, 'salt', KEY_LENGTH)
  }

  /**
   * Encrypt a value
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()

    // Combine iv + encrypted + tag
    return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex')
  }

  /**
   * Decrypt a value
   */
  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const encrypted = parts[1]
      const tag = Buffer.from(parts[2], 'hex')

      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv)
      decipher.setAuthTag(tag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      return '[DECRYPTION_FAILED]'
    }
  }

  // ===== PROFILES =====

  /**
   * Get all environment profiles
   */
  getAllProfiles(): EnvProfile[] {
    const stmt = db.prepare('SELECT * FROM env_profiles ORDER BY name')
    const rows = stmt.all() as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  /**
   * Get profile by ID
   */
  getProfile(profileId: string): EnvProfile | null {
    const stmt = db.prepare('SELECT * FROM env_profiles WHERE id = ?')
    const row = stmt.get(profileId) as any

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  /**
   * Create a new profile
   */
  createProfile(name: string, description?: string): EnvProfile {
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const stmt = db.prepare(`
      INSERT INTO env_profiles (id, name, description)
      VALUES (?, ?, ?)
    `)

    stmt.run(id, name, description || null)

    return {
      id,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Update a profile
   */
  updateProfile(profileId: string, updates: { name?: string; description?: string }): boolean {
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

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(profileId)

    const stmt = db.prepare(`
      UPDATE env_profiles SET ${fields.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0
  }

  /**
   * Delete a profile
   */
  deleteProfile(profileId: string): boolean {
    const stmt = db.prepare('DELETE FROM env_profiles WHERE id = ?')
    const result = stmt.run(profileId)
    return result.changes > 0
  }

  // ===== VARIABLES =====

  /**
   * Get all variables for a profile
   */
  getVariables(profileId: string, serviceId?: string): EnvVariable[] {
    let query = 'SELECT * FROM env_variables WHERE profile_id = ?'
    const params: any[] = [profileId]

    if (serviceId) {
      query += ' AND service_id = ?'
      params.push(serviceId)
    } else {
      query += ' AND service_id IS NULL'
    }

    query += ' ORDER BY key'

    const stmt = db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => ({
      id: row.id,
      key: row.key,
      value: row.is_secret ? this.decrypt(row.value) : row.value,
      profileId: row.profile_id,
      serviceId: row.service_id,
      isSecret: Boolean(row.is_secret),
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  /**
   * Get a single variable
   */
  getVariable(variableId: string): EnvVariable | null {
    const stmt = db.prepare('SELECT * FROM env_variables WHERE id = ?')
    const row = stmt.get(variableId) as any

    if (!row) return null

    return {
      id: row.id,
      key: row.key,
      value: row.is_secret ? this.decrypt(row.value) : row.value,
      profileId: row.profile_id,
      serviceId: row.service_id,
      isSecret: Boolean(row.is_secret),
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  /**
   * Create a new variable
   */
  createVariable(data: {
    key: string
    value: string
    profileId: string
    serviceId?: string
    isSecret?: boolean
    description?: string
  }): EnvVariable {
    const id = `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const isSecret = data.isSecret || false
    const value = isSecret ? this.encrypt(data.value) : data.value

    const stmt = db.prepare(`
      INSERT INTO env_variables (id, key, value, profile_id, service_id, is_secret, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      data.key,
      value,
      data.profileId,
      data.serviceId || null,
      isSecret ? 1 : 0,
      data.description || null
    )

    return {
      id,
      key: data.key,
      value: data.value, // Return decrypted value
      profileId: data.profileId,
      serviceId: data.serviceId,
      isSecret,
      description: data.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Update a variable
   */
  updateVariable(
    variableId: string,
    updates: {
      key?: string
      value?: string
      isSecret?: boolean
      description?: string
    }
  ): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (updates.key !== undefined) {
      fields.push('key = ?')
      values.push(updates.key)
    }
    if (updates.value !== undefined) {
      fields.push('value = ?')
      const isSecret = updates.isSecret !== undefined ? updates.isSecret : false
      values.push(isSecret ? this.encrypt(updates.value) : updates.value)
    }
    if (updates.isSecret !== undefined) {
      fields.push('is_secret = ?')
      values.push(updates.isSecret ? 1 : 0)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(variableId)

    const stmt = db.prepare(`
      UPDATE env_variables SET ${fields.join(', ')} WHERE id = ?
    `)

    const result = stmt.run(...values)
    return result.changes > 0
  }

  /**
   * Delete a variable
   */
  deleteVariable(variableId: string): boolean {
    const stmt = db.prepare('DELETE FROM env_variables WHERE id = ?')
    const result = stmt.run(variableId)
    return result.changes > 0
  }

  // ===== FILE OPERATIONS =====

  /**
   * Read .env file
   */
  readEnvFile(filePath: string): Record<string, string> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const variables: Record<string, string> = {}

      content.split('\n').forEach(line => {
        line = line.trim()

        // Skip comments and empty lines
        if (!line || line.startsWith('#')) return

        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          let value = match[2].trim()

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }

          variables[key] = value
        }
      })

      return variables
    } catch (error: any) {
      throw new Error(`Failed to read .env file: ${error.message}`)
    }
  }

  /**
   * Write .env file
   */
  writeEnvFile(filePath: string, variables: Record<string, string>): void {
    try {
      const lines = Object.entries(variables).map(([key, value]) => {
        // Quote values with spaces or special characters
        if (value.includes(' ') || value.includes('#') || value.includes('$')) {
          value = `"${value}"`
        }
        return `${key}=${value}`
      })

      const content = lines.join('\n') + '\n'
      fs.writeFileSync(filePath, content, 'utf-8')
    } catch (error: any) {
      throw new Error(`Failed to write .env file: ${error.message}`)
    }
  }

  /**
   * Import variables from .env file
   */
  importFromEnvFile(filePath: string, profileId: string, serviceId?: string): number {
    const variables = this.readEnvFile(filePath)
    let imported = 0

    for (const [key, value] of Object.entries(variables)) {
      // Check if variable already exists
      const existing = db.prepare(`
        SELECT id FROM env_variables
        WHERE profile_id = ? AND key = ? AND service_id IS ?
      `).get(profileId, key, serviceId || null)

      if (existing) {
        // Update existing
        this.updateVariable((existing as any).id, { value })
      } else {
        // Create new
        this.createVariable({
          key,
          value,
          profileId,
          serviceId,
          isSecret: false,
        })
      }
      imported++
    }

    return imported
  }

  /**
   * Export variables to .env file
   */
  exportToEnvFile(profileId: string, filePath: string, serviceId?: string): number {
    const variables = this.getVariables(profileId, serviceId)
    const varObject: Record<string, string> = {}

    variables.forEach(v => {
      varObject[v.key] = v.value
    })

    this.writeEnvFile(filePath, varObject)
    return variables.length
  }

  /**
   * Copy variables from one profile to another
   */
  copyProfile(sourceProfileId: string, targetProfileId: string): number {
    const sourceVars = this.getVariables(sourceProfileId)
    let copied = 0

    sourceVars.forEach(v => {
      this.createVariable({
        key: v.key,
        value: v.value,
        profileId: targetProfileId,
        serviceId: v.serviceId,
        isSecret: v.isSecret,
        description: v.description,
      })
      copied++
    })

    return copied
  }
}
