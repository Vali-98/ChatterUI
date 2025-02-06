import { Characters } from '../state/Characters'

type Macro = {
    macro: string
    value: string
}

const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const replaceMacros = (text: string) => {
    if (text === undefined) return ''
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
    ]
    for (const rule of rules) newtext = newtext.replaceAll(rule.macro, rule.value)
    return newtext
}
