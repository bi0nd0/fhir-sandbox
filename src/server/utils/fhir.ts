import { BadRequestError } from './errors'

const PATIENT_ID_REGEX = /^[A-Za-z0-9\-.]{1,64}$/
const PATIENT_REFERENCE_REGEX = /^Patient\/([A-Za-z0-9\-.]{1,64})$/

export const normalizePatientReference = (value: string): string => {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new BadRequestError('Query parameter "patient" must not be empty')
  }

  const referenceMatch = trimmed.match(PATIENT_REFERENCE_REGEX)
  if (referenceMatch) {
    return referenceMatch[1]
  }

  if (PATIENT_ID_REGEX.test(trimmed)) {
    return trimmed
  }

  throw new BadRequestError(
    'Query parameter "patient" must match the formats "<id>" or "Patient/<id>"',
  )
}
