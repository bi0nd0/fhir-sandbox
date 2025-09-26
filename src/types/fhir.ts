export const OBSERVATION_CATEGORIES = [
  'vital-signs',
  'laboratory',
  'social-history',
  'core-characteristics',
] as const

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number]

export const CONDITION_CATEGORIES = [
  'problem-list-item',
  'reason-for-visit',
  'medical-history',
  'dental-finding',
  'infection',
  'encounter-diagnosis',
  'genomics',
] as const

export type ConditionCategory = (typeof CONDITION_CATEGORIES)[number]

export const APPOINTMENT_SERVICE_CATEGORIES = ['appointment', 'surgery'] as const

export type AppointmentServiceCategory = (typeof APPOINTMENT_SERVICE_CATEGORIES)[number]

export type ResourceType =
  | 'Patient'
  | 'Observation'
  | 'AllergyIntolerance'
  | 'MedicationRequest'
  | 'Condition'
  | 'Coverage'
  | 'Encounter'
  | 'Appointment'
  | 'Device'
  | 'Procedure'
  | 'Immunization'
