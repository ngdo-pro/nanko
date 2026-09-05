import { z } from 'zod'

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  keycloakId: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
})

export type ValidatedUserProfile = z.infer<typeof userProfileSchema>
