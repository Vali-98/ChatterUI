export type MacroValues = Readonly<Record<string, string | undefined>>

export const createMacroValues = (
    names: { char: string; user: string },
    now: Date | null = new Date()
): MacroValues => {
    if (!now) return names
    return {
        ...names,
        time: now.toLocaleTimeString(),
        date: now.toLocaleDateString(),
        weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
            now.getDay()
        ],
    }
}

export const applyMacros = (text: string, values: MacroValues): string =>
    text.replace(
        /(?<!\{)(?:\{\{([^{}]+)\}\}|\{(char|user)\})(?!\})/g,
        (token, fullName: string | undefined, shortName: string | undefined) => {
            const name = fullName ?? shortName!
            return Object.hasOwn(values, name) ? (values[name] ?? token) : token
        }
    )
