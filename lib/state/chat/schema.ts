import { z } from 'zod'

const completionTimingsSchema = z.object({
    predicted_per_token_ms: z.number(),
    predicted_per_second: z.number().nullable(),
    predicted_ms: z.number(),
    predicted_n: z.number(),

    prompt_per_token_ms: z.number(),
    prompt_per_second: z.number().nullable(),
    prompt_ms: z.number(),
    prompt_n: z.number(),
})

const swipeSchema = z.object({
    swipe: z.string(),
    id: z.number().optional(),
    entry_id: z.number(),
    send_date: z.coerce.date(),
    gen_started: z.coerce.date(),
    gen_finished: z.coerce.date(),
    active: z.boolean(),
    token_length: z.number().nullable(),
    reset_length: z.number().nullable(),
    timings: completionTimingsSchema.nullable(),
})

const attachmentSchema = z.object({
    id: z.number(),
    type: z.enum(['audio', 'image', 'document']),
    name: z.string(),
    chat_entry_id: z.number(),
    uri: z.string(),
    mime_type: z.string(),
    size: z.number(),
})

const messageSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    chat_id: z.number(),
    is_user: z.boolean(),
    order: z.number().default(0),
    swipe_id: z.number().default(0),
    swipes: z.array(swipeSchema),
    attachments: z.array(attachmentSchema).default([]),
})

export const chatImportSchema = z.object({
    id: z.number().optional(),
    name: z.string(),
    last_modified: z.number().nullable(),
    character_id: z.number(),
    create_date: z.coerce.date(),
    user_id: z.number().nullable(),
    scroll_offset: z.number(),
    messages: z.array(messageSchema),
})
