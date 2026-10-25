import { applyMacros, MacroValues } from '@lib/utils/Macros'

import type { CharacterCard, CharacterTokenCounts } from './types'

export const prepareCharacterTokenText = (card: CharacterCard, values: MacroValues) => ({
    description: applyMacros(card.description, values),
    examples: applyMacros(card.mes_example, values),
    personality: applyMacros(card.personality, values),
    scenario: applyMacros(card.scenario, values),
})

export const countCharacterTokens = async (
    text: ReturnType<typeof prepareCharacterTokenText>,
    {
        otherParticipantName,
        tokenizer,
    }: {
        otherParticipantName: string
        tokenizer: (text: string) => Promise<number>
    }
): Promise<CharacterTokenCounts> => ({
    otherParticipantName: otherParticipantName,
    descriptionTokens: await tokenizer(text.description),
    exampleTokens: await tokenizer(text.examples),
    personalityTokens: await tokenizer(text.personality),
    scenarioTokens: await tokenizer(text.scenario),
})
