import type {
  AppointmentServiceCategory,
  ConditionCategory,
  ObservationCategory,
} from '../../types/fhir'
import { readResourceFile } from './data-loader'
import { loadConditionsForCategory } from './condition-resolver'
import { loadObservationsForCategory } from './observation-resolver'
import { loadAppointmentsForCategory } from './appointment-resolver'

const RESOURCE_FILES = {
  Patient: 'patient.json',
  AllergyIntolerance: 'allergyintolerance.json',
  MedicationRequest: 'medicationrequest.json',
  Coverage: 'coverage.json',
  Encounter: 'encounter.json',
  Device: 'device.json',
  Procedure: 'procedure.json',
  Immunization: 'immunization.json',
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

export const getCoverage = async <T = unknown>(patientId: string): Promise<T> =>
  loadResource(patientId, 'Coverage') as Promise<T>

export const getEncounters = async <T = unknown>(patientId: string): Promise<T> =>
  loadResource(patientId, 'Encounter') as Promise<T>

export const getDevices = async <T = unknown>(patientId: string): Promise<T> =>
  loadResource(patientId, 'Device') as Promise<T>

export const getProcedures = async <T = unknown>(patientId: string): Promise<T> =>
  loadResource(patientId, 'Procedure') as Promise<T>

export const getImmunizations = async <T = unknown>(patientId: string): Promise<T> =>
  loadResource(patientId, 'Immunization') as Promise<T>

export const getObservations = async <T = unknown>(
  patientId: string,
  category: ObservationCategory,
): Promise<T> => loadObservationsForCategory<T>(patientId, category)

export const getConditions = async <T = unknown>(
  patientId: string,
  category: ConditionCategory,
): Promise<T> => loadConditionsForCategory<T>(patientId, category)

export const getAppointments = async <T = unknown>(
  patientId: string,
  category: AppointmentServiceCategory,
): Promise<T> => loadAppointmentsForCategory<T>(patientId, category)
