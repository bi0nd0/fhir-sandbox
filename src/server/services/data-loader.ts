import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { DataStoreError, NotFoundError } from '../utils/errors'

const DATA_ROOT = process.env.DATA_ROOT ?? path.resolve(process.cwd(), 'data', 'r4')

export const resolveResourcePath = (patientId: string, fileName: string): string =>
  path.join(DATA_ROOT, patientId, fileName)

export const readResourceFile = async <T>(patientId: string, fileName: string): Promise<T> => {
  const filePath = resolveResourcePath(patientId, fileName)

  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new NotFoundError(`Resource file not found at ${filePath}`)
    }

    throw new DataStoreError(`Unable to read resource file at ${filePath}`)
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new DataStoreError(`Invalid JSON payload at ${filePath}`)
  }
}
