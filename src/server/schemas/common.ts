import { z } from 'zod'

export const patientQuerySchema = z.object({
  patient: z.string().min(1, 'Query parameter "patient" is required'),
})
