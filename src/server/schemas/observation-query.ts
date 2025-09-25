import { z } from 'zod'

import { OBSERVATION_CATEGORIES } from '../../types/fhir'
import { patientQuerySchema } from './common'

export const observationQuerySchema = patientQuerySchema.extend({
  category: z.enum(OBSERVATION_CATEGORIES),
})
