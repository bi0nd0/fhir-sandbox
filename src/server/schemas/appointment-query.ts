import { z } from 'zod'

import { APPOINTMENT_SERVICE_CATEGORIES } from '../../types/fhir'
import { patientQuerySchema } from './common'

export const appointmentQuerySchema = patientQuerySchema.extend({
  'service-category': z.enum(APPOINTMENT_SERVICE_CATEGORIES),
})
