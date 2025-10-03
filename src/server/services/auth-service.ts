import { readFileSync } from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'

import { AuthCredentialSeedSchema, type AuthCredential } from '../schemas/auth'
import * as schema from '../db/schema'
import { DataStoreError } from '../utils/errors'
import { createChildLogger, type Logger } from '../utils/logger'

const DEFAULT_CREDENTIALS_PATH = path.resolve(process.cwd(), 'data', 'auth', 'credentials.json')

export type AuthenticatedUser = {
  id: string
  username: string
  displayName: string
  patientId?: string
}

type AuthDatabase = BetterSQLite3Database<typeof schema>

const loadCredentialSeed = (): AuthCredential[] => {
  const credentialsPath = process.env.AUTH_CREDENTIALS_PATH ?? DEFAULT_CREDENTIALS_PATH

  let raw: string
  try {
    raw = readFileSync(credentialsPath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new DataStoreError(`Credential seed file not found at ${credentialsPath}`)
    }

    throw new DataStoreError(`Unable to read credential seed at ${credentialsPath}`)
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    throw new DataStoreError(`Invalid JSON payload in credential seed at ${credentialsPath}`)
  }

  const parsed = AuthCredentialSeedSchema.safeParse(parsedJson)

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const message = firstIssue?.message ?? 'Unexpected credential seed validation error'
    throw new DataStoreError(`Credential seed validation failed: ${message}`)
  }

  return parsed.data
}

const createDatabase = (): AuthDatabase => {
  const sqlite = new Database(':memory:')
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      patient_id TEXT
    );
  `)

  return drizzle(sqlite, { schema })
}

const seedCredentials = (db: AuthDatabase, credentials: AuthCredential[]): void => {
  for (const credential of credentials) {
    db.insert(schema.users)
      .values({
        id: credential.id,
        username: credential.username,
        password: credential.password,
        displayName: credential.displayName,
        patientId: credential.patientId ?? null,
      })
      .onConflictDoNothing()
      .run()
  }
}

export class AuthService {
  constructor(private readonly db: AuthDatabase, private readonly log: Logger) {}

  verifyCredentials(username: string, password: string): AuthenticatedUser | undefined {
    const record = this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        password: schema.users.password,
        displayName: schema.users.displayName,
        patientId: schema.users.patientId,
      })
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .get()

    if (!record) {
      this.log.warn({ username }, 'Authentication failed: unknown user')
      return undefined
    }

    if (record.password !== password) {
      this.log.warn({ username }, 'Authentication failed: invalid password')
      return undefined
    }

    return {
      id: record.id,
      username: record.username,
      displayName: record.displayName,
      patientId: record.patientId ?? undefined,
    }
  }

  listUsers(): AuthenticatedUser[] {
    return this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        patientId: schema.users.patientId,
      })
      .from(schema.users)
      .all()
      .map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        patientId: user.patientId ?? undefined,
      }))
  }
}

export const createAuthService = (): AuthService => {
  const credentials = loadCredentialSeed()
  const db = createDatabase()
  seedCredentials(db, credentials)

  const log = createChildLogger({ module: 'auth-service' })
  log.info({ userCount: credentials.length }, 'Authentication credentials loaded')

  return new AuthService(db, log)
}
