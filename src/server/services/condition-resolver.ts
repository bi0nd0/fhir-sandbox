import { CONDITION_CATEGORIES, type ConditionCategory } from '../../types/fhir'
import { BadRequestError } from '../utils/errors'
import { readResourceFile } from './data-loader'

const categories = new Set<string>(CONDITION_CATEGORIES)

export const ensureConditionCategory = (value?: string): ConditionCategory => {
  if (!value) {
    throw new BadRequestError(
      `Query parameter "category" is required. Supported values: ${CONDITION_CATEGORIES.join(', ')}`,
    )
  }

  if (!categories.has(value)) {
    throw new BadRequestError(
      `Unsupported condition category "${value}". Supported values: ${CONDITION_CATEGORIES.join(', ')}`,
    )
  }

  return value as ConditionCategory
}

export const conditionFileName = (category: ConditionCategory): string =>
  `condition.${category}.json`

export const loadConditionsForCategory = async <T>(
  patientId: string,
  category: ConditionCategory,
): Promise<T> => readResourceFile<T>(patientId, conditionFileName(category))
