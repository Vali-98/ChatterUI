import { Instructs } from '@lib/state/Instructs'
import { Characters } from '../state/Characters'

export type Macro = {
    macro: string | RegExp
    value: string
}

type ReplaceMacroOptions = {
    extraMacros?: Macro[]
}

const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const getDefaultMacroRules = (): Macro[] => {
    const charName = Characters.useCharacterCard.getState().card?.name ?? ''
    const userName = Characters.useUserCard.getState().card?.name ?? ''
    const time = new Date()
    const rules: Macro[] = [
        { macro: '{{user}}', value: userName },
        { macro: '{{char}}', value: charName },
        { macro: '{{time}}', value: time.toLocaleTimeString() },
        { macro: '{{date}}', value: time.toLocaleDateString() },
        { macro: '{{weekday}}', value: weekday[time.getDay()] },
    ]
    return rules
}
/* TODO: Deprecate */
/**
 * @deprecated
 * @param text
 * @param options
 * @returns
 */
export const replaceMacros = (text: string, options: ReplaceMacroOptions = { extraMacros: [] }) => {
    let newtext: string = text
    const charName = Characters.useCharacterCard.getState().card?.name ?? ''
    const userName = Characters.useUserCard.getState().card?.name ?? ''
    const time = new Date()
    const rules: Macro[] = [
        { macro: '{{user}}', value: userName },
        { macro: '{{char}}', value: charName },
        { macro: '{{time}}', value: time.toLocaleTimeString() },
        { macro: '{{date}}', value: time.toLocaleDateString() },
        { macro: '{{weekday}}', value: weekday[time.getDay()] },
        ...(options?.extraMacros ?? []),
    ]
    for (const rule of rules) newtext = newtext.replaceAll(rule.macro, rule.value)
    return newtext
}
