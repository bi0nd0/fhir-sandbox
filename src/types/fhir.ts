export const OBSERVATION_CATEGORIES = ['vital-signs', 'laboratory', 'social-history'] as const

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number]

export const CONDITION_CATEGORIES = [
  'problem-list-item',
  'reason-for-visit',
  'medical-history',
] as const

export type ConditionCategory = (typeof CONDITION_CATEGORIES)[number]

export type ResourceType =
  | 'Patient'
  | 'Observation'
  | 'AllergyIntolerance'
  | 'MedicationRequest'
  | 'Condition'
  | 'Coverage'
  | 'Encounter'
