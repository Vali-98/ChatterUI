import { z } from 'zod'

export const lorebookEntryImportSchema = z.object({
    keys: z.array(z.string()),
    content: z.string(),

    enabled: z.boolean().default(true),
    insertion_order: z.number().int().default(100),
    case_sensitive: z.boolean().default(true),

    name: z.string().default('New Entry'),
    priority: z.number().int().default(100),

    selective: z.boolean().default(false),
    constant: z.boolean().default(false),
    comment: z.string().default(''),
    secondary_keys: z.array(z.string()).default([]),
})

export const lorebookImportSchema = z.object({
    name: z.string().default('New Lorebook'),
    description: z.string().default(''),

    scan_depth: z.number().int().default(1),
    token_budget: z.number().int().default(1024),
    recursive_scanning: z.boolean().default(false),

    entries: z.preprocess((val) => {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            return Object.values(val)
        }
        return val
    }, z.array(lorebookEntryImportSchema)),
})

export type LorebookImport = z.infer<typeof lorebookImportSchema>
export type LorebookEntryImport = z.infer<typeof lorebookEntryImportSchema>
