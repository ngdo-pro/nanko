import { z } from 'zod'

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom doit comporter au moins 2 caractères')
    .max(100, 'Nom trop long'),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des minuscules, chiffres et tirets'),
})

export const projectSchema = z.object({
  id: z.string().uuid(),
  organisationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
})

export const organisationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isPersonal: z.boolean(),
  role: z.string(),
  createdAt: z.string(),
  projects: z.array(projectSchema),
})

export const organisationsResponseSchema = z.array(organisationSchema)
export const projectsResponseSchema = z.array(projectSchema)

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type Project = z.infer<typeof projectSchema>
export type Organisation = z.infer<typeof organisationSchema>
