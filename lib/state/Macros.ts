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
    const charName = Characters.useCharacterStore.getState().card?.name ?? ''
    const userName = Characters.useUserStore.getState().card?.name ?? ''
    const rules: Macro[] = [
        { macro: /{{?user}}?/g, value: userName },
        { macro: /{{?char}}?/g, value: charName },
        ...(options?.extraMacros ?? []),
    ]
    for (const rule of rules) newtext = replaceMacroBase(text, { extraMacros: rules })
    return newtext
}
