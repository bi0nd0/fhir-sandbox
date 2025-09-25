export const OBSERVATION_CATEGORIES = ['vital-signs', 'laboratory', 'social-history'] as const

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number]

export type ResourceType = 'Patient' | 'Observation' | 'AllergyIntolerance' | 'MedicationRequest'
