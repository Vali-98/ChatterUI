import { Macro, replaceMacroBase } from '@lib/utils/Macros'
import { Characters } from './Characters'

/**
 * @param text text to be filtered
 * @param options extraMacros definition
 * @returns
 */
export const replaceMacros = (
    text: string,
    options: { extraMacros: Macro[] } = { extraMacros: [] }
) => {
    let newtext: string = text
    const charName = Characters.useCharacterCard.getState().card?.name ?? ''
    const userName = Characters.useUserCard.getState().card?.name ?? ''
    const rules: Macro[] = [
        { macro: '{{user}}', value: userName },
        { macro: '{{char}}', value: charName },
        ...(options?.extraMacros ?? []),
    ]
    for (const rule of rules) newtext = replaceMacroBase(text, { extraMacros: rules })
    return newtext
}
