import type { ObservationCategory } from '../../types/fhir'
import { readResourceFile } from './data-loader'
import { loadObservationsForCategory } from './observation-resolver'

const RESOURCE_FILES = {
  Patient: 'patient.json',
  AllergyIntolerance: 'allergyintolerance.json',
  MedicationRequest: 'medicationrequest.json',
} as const

type ResourceKey = keyof typeof RESOURCE_FILES

const loadResource = async (patientId: string, key: ResourceKey): Promise<unknown> =>
  readResourceFile(patientId, RESOURCE_FILES[key])

export const getPatient = async <T = unknown>(patientId: string): Promise<T> =>
  loadResource(patientId, 'Patient') as Promise<T>

export const getAllergyIntolerances = async <T = unknown>(patientId: string): Promise<T> =>
  loadResource(patientId, 'AllergyIntolerance') as Promise<T>

export const getMedicationRequests = async <T = unknown>(patientId: string): Promise<T> =>
  loadResource(patientId, 'MedicationRequest') as Promise<T>

export const getObservations = async <T = unknown>(
  patientId: string,
  category: ObservationCategory,
): Promise<T> => loadObservationsForCategory<T>(patientId, category)
