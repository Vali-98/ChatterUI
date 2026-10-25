import { z } from 'zod'

import type { CharacterCard } from './types'

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

export type CharacterCardV2 = z.infer<typeof characterCardV2Schema>

export const buildBlankCharacterCard = (
    name: string,
    fields: Partial<
        Pick<
            CharacterCardV2['data'],
            'description' | 'personality' | 'scenario' | 'first_mes' | 'mes_example'
        >
    > = {}
): CharacterCardV2 => {
    return {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: name,
            description: fields.description ?? '',
            personality: fields.personality ?? '',
            scenario: fields.scenario ?? '',
            first_mes: fields.first_mes ?? '',
            mes_example: fields.mes_example ?? '',

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

export const toCharacterCardV2 = (card: CharacterCard): CharacterCardV2 => {
    return {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: card.name,
            description: card.description,
            personality: card.personality,
            scenario: card.scenario,
            first_mes: card.first_mes,
            mes_example: card.mes_example,
            creator_notes: card.creator_notes,
            system_prompt: card.system_prompt,
            post_history_instructions: card.post_history_instructions,
            creator: card.creator,
            character_version: card.character_version,
            tags: card.tags.map((item) => item.tag.tag),
            alternate_greetings: card.alternate_greetings.map((item) => item.greeting),
        },
    }
}
