import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

const DEFAULT_DB_PATH = process.env.SANDBOX_DB_PATH
  ?? path.resolve(process.cwd(), 'data', 'storage', 'sandbox.sqlite')

const directory = path.dirname(DEFAULT_DB_PATH)

if (!existsSync(directory)) {
  mkdirSync(directory, { recursive: true })
}

export const sqlite = new Database(DEFAULT_DB_PATH)

sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
