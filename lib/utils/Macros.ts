export type Macro = {
    macro: string | RegExp
    value: string
}

type ReplaceMacroOptions = {
    extraMacros?: Macro[]
}

const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const getDefaultMacros = () => {
    const time = new Date()
    const rules: Macro[] = [
        { macro: '{{time}}', value: time.toLocaleTimeString() },
        { macro: '{{date}}', value: time.toLocaleDateString() },
        { macro: '{{weekday}}', value: weekday[time.getDay()] },
    ]
    return rules
}

export const replaceMacroBase = (
    text: string,
    options: ReplaceMacroOptions = { extraMacros: [] }
) => {
    let newtext: string = text
    const rules = [...getDefaultMacros(), ...(options?.extraMacros ?? [])]
    for (const rule of rules) newtext = newtext.replaceAll(rule.macro, rule.value)
    return newtext
}
