import { z } from 'zod'

const characterCardV2DataSchema = z.object({
    name: z.string(),
    description: z.string().catch(''),
    personality: z.string().catch(''),
    scenario: z.string().catch(''),
    first_mes: z.string().catch(''),
    mes_example: z.string().catch(''),
    creator_notes: z.string().catch(''),
    system_prompt: z.string().catch(''),
    post_history_instructions: z.string().catch(''),
    creator: z.string().catch(''),
    character_version: z.string().catch(''),
    alternate_greetings: z.string().array().catch([]),
    tags: z.string().array().catch([]),
})

const characterCardV2Schema = z.object({
    spec: z.literal('chara_card_v2'),
    spec_version: z.literal('2.0'),
    data: characterCardV2DataSchema,
})

export type CharacterCardV2 = z.infer<typeof characterCardV2Schema>

export const parseCharacterCardV2 = (source: unknown) => {
    try {
        const data = typeof source === 'string' ? JSON.parse(source) : source
        return characterCardV2Schema.safeParse(data)
    } catch {
        return characterCardV2Schema.safeParse(undefined)
    }
}
