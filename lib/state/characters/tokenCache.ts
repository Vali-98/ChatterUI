import { applyMacros, MacroValues } from '@lib/utils/Macros'

import type { CharacterCardData, CharacterTokenCache } from './types'

export const prepareTokenText = (card: NonNullable<CharacterCardData>, values: MacroValues) => ({
    description: applyMacros(card.description, values),
    examples: applyMacros(card.mes_example, values),
    personality: applyMacros(card.personality, values),
    scenario: applyMacros(card.scenario, values),
})

export const countTokenText = async (
    text: ReturnType<typeof prepareTokenText>,
    otherName: string,
    tokenizer: (text: string) => Promise<number>
): Promise<CharacterTokenCache> => ({
    otherName: otherName,
    description_length: await tokenizer(text.description),
    examples_length: await tokenizer(text.examples),
    personality_length: await tokenizer(text.personality),
    scenario_length: await tokenizer(text.scenario),
})
