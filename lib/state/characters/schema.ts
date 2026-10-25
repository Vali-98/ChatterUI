import { z } from 'zod'

import type { CharacterCardData } from './types'

export const characterCardV1Schema = z.object({
    name: z.string(),
    description: z.string(),
    personality: z.string().catch(''),
    scenario: z.string().catch(''),
    first_mes: z.string().catch(''),
    mes_example: z.string().catch(''),
})

export const characterCardV2DataSchema = z.object({
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

export const characterCardV2Schema = z.object({
    spec: z.literal('chara_card_v2'),
    spec_version: z.literal('2.0'),
    data: characterCardV2DataSchema,
})

// placeholder types
// type CharaterCardV1 = z.infer<typeof characterCardV1Schema>
// type CharacterCardV2Data = z.infer<typeof characterCardV2DataSchema>

export type CharacterCardV2 = z.infer<typeof characterCardV2Schema>

export const createBlankV2Card = (
    name: string,
    options: {
        description: string
        personality: string
        scenario: string
        first_mes: string
        mes_example: string
    } = { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' }
): CharacterCardV2 => {
    return {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: name,
            description: options.description,
            personality: options.personality,
            scenario: options.scenario,
            first_mes: options.first_mes,
            mes_example: options.mes_example,

            // New fields start here
            creator_notes: '',
            system_prompt: '',
            post_history_instructions: '',
            alternate_greetings: [],

            // May 8th additions
            tags: [],
            creator: '',
            character_version: '',
        },
    }
}

export const convertDBDataToCV2 = (data: NonNullable<CharacterCardData>): CharacterCardV2 => {
    return {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: data.name,
            description: data.description,
            personality: data.personality,
            scenario: data.scenario,
            first_mes: data.first_mes,
            mes_example: data.mes_example,
            creator_notes: data.creator_notes,
            system_prompt: data.system_prompt,
            post_history_instructions: data.post_history_instructions,
            creator: data.creator,
            character_version: data.character_version,
            tags: data.tags.map((item) => item.tag.tag),
            alternate_greetings: data.alternate_greetings.map((item) => item.greeting),
        },
    }
}
