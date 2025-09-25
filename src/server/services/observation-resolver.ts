import { OBSERVATION_CATEGORIES, type ObservationCategory } from '../../types/fhir'
import { BadRequestError } from '../utils/errors'
import { readResourceFile } from './data-loader'

const categories = new Set<string>(OBSERVATION_CATEGORIES)

export const ensureObservationCategory = (value?: string): ObservationCategory => {
  if (!value) {
    throw new BadRequestError(
      `Query parameter "category" is required. Supported values: ${OBSERVATION_CATEGORIES.join(', ')}`,
    )
  }

  if (!categories.has(value)) {
    throw new BadRequestError(
      `Unsupported observation category "${value}". Supported values: ${OBSERVATION_CATEGORIES.join(', ')}`,
    )
  }

  return value as ObservationCategory
}

export const observationFileName = (category: ObservationCategory): string =>
  `observation.${category}.json`

export const loadObservationsForCategory = async <T>(
  patientId: string,
  category: ObservationCategory,
): Promise<T> => readResourceFile<T>(patientId, observationFileName(category))
