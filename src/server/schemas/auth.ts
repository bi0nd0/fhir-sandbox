import { z } from 'zod'

export const AuthCredentialSchema = z.object({
  id: z.string().min(1, 'User id is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  displayName: z.string().min(1, 'Display name is required'),
  patientId: z.string().min(1).optional(),
})

export type AuthCredential = z.infer<typeof AuthCredentialSchema>

export const AuthCredentialSeedSchema = z
  .array(AuthCredentialSchema)
  .min(1, 'At least one credential must be configured')
