import { z } from 'zod'

import { CONDITION_CATEGORIES } from '../../types/fhir'
import { patientQuerySchema } from './common'

export const conditionQuerySchema = patientQuerySchema.extend({
  category: z.enum(CONDITION_CATEGORIES),
})
