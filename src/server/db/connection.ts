import Database from 'better-sqlite3'

export const sqlite = new Database(':memory:')

sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
