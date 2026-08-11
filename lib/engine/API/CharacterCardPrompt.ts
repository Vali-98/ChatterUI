export const originalPromptMacro = '{{original}}'

type CharacterPromptSource = {
    description?: string | null
    personality?: string | null
    scenario?: string | null
    mes_example?: string | null
    system_prompt?: string | null
    post_history_instructions?: string | null
}

const resolveCardInstruction = (custom: string | null | undefined, original: string) => {
    if (!custom?.trim()) return original
    return custom.replaceAll(originalPromptMacro, original)
}

export const getCharacterPromptLayers = (
    character: CharacterPromptSource | null | undefined,
    defaultSystemInstruction: string,
    defaultPostHistoryInstruction: string = ''
) => ({
    systemInstruction: resolveCardInstruction(character?.system_prompt, defaultSystemInstruction),
    postHistoryInstruction: resolveCardInstruction(
        character?.post_history_instructions,
        defaultPostHistoryInstruction
    ),
    description: character?.description ?? '',
    personality: character?.personality ?? '',
    scenario: character?.scenario ?? '',
    examples: character?.mes_example ?? '',
})
