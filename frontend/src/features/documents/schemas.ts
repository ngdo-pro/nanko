import { z } from 'zod'

export const nankoAstShapeSchema = z.object({
  id: z.string(),
  type: z.enum(['rectangle', 'circle', 'text']),
  label: z.string(),
})

export const nankoAstConnectorSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional().nullable(),
})

export const nodeCoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const nankoAstLayoutSchema = z.record(z.string(), nodeCoordinatesSchema)

export const nankoAstSchema = z.object({
  shapes: z.array(nankoAstShapeSchema).default([]),
  connectors: z.array(nankoAstConnectorSchema).default([]),
  layout: z
    .union([nankoAstLayoutSchema, z.array(z.any()).transform(() => ({}))])
    .optional()
    .default({}),
})

export const documentListItemSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  layer: z.number().int(),
  shapesCount: z.number().int().optional().default(0),
  connectorsCount: z.number().int().optional().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const documentsListResponseSchema = z.array(documentListItemSchema)

export const documentDetailSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  layer: z.number().int(),
  sourceCode: z.string(),
  ast: nankoAstSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createDocumentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom doit comporter au moins 2 caractères')
    .max(255, 'Nom trop long'),
  slug: z
    .string()
    .trim()
    .min(2, 'Le slug doit comporter au moins 2 caractères')
    .max(100, 'Slug trop long')
    .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des minuscules, chiffres et tirets'),
  layer: z.coerce.number().int('Le layer doit être un entier').default(0),
})

export const updateDocumentSchema = z.object({
  sourceCode: z.string(),
})

export type NankoAstShape = z.infer<typeof nankoAstShapeSchema>
export type NankoAstConnector = z.infer<typeof nankoAstConnectorSchema>
export type NodeCoordinates = z.infer<typeof nodeCoordinatesSchema>
export type NankoAstLayout = z.infer<typeof nankoAstLayoutSchema>
export type NankoAst = z.infer<typeof nankoAstSchema>
export type DocumentListItem = z.infer<typeof documentListItemSchema>
export type DocumentDetail = z.infer<typeof documentDetailSchema>
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
