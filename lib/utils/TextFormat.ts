import { Instructs } from '@lib/state/Instructs'

export enum Formats {
    None,
    PlainActionQuoteSpeech,
    AsteriskActionPlainSpeech,
    AsteriskActionQuoteSpeech,
}

type TextTypes = 'action' | 'speech' | 'none'

type TextData = {
    type: TextTypes
    content: string
}

const detectFormat = (input: string): Formats => {
    const hasAsterisk = input.includes('*')
    const hasQuote = input.includes('"')
    if (hasQuote && !hasAsterisk) {
        return Formats.PlainActionQuoteSpeech
    } else if (!hasQuote && hasAsterisk) {
        return Formats.AsteriskActionPlainSpeech
    } else if (hasQuote && hasAsterisk) {
        const asteriskMatches = input.match(/\*([^*]*)\*/)
        if (asteriskMatches) {
            const asteriskContent = asteriskMatches[1]
            const quoteMatchesInAsterisk = asteriskContent.match(/"([^"]*)"/)
            if (quoteMatchesInAsterisk && quoteMatchesInAsterisk[1].split(' ').length > 1) {
                return Formats.AsteriskActionQuoteSpeech
            }
        }
        const quoteMatchesOutsideAsterisk = input.match(/"([^"]*)"/g)
        if (quoteMatchesOutsideAsterisk) {
            for (const quoteMatch of quoteMatchesOutsideAsterisk) {
                if (
                    !asteriskMatches ||
                    (asteriskMatches && !asteriskMatches[0].includes(quoteMatch))
                ) {
                    const clean = quoteMatch.replace(/"/g, '')
                    if (clean.split(' ').length > 1 || /[.!?]$/.test(clean)) {
                        return Formats.AsteriskActionQuoteSpeech
                    }
                }
            }
        }
    }

    return Formats.None
}

const destructString = (input: string, format: Formats): TextData[] => {
    const textData: TextData[] = []

    switch (format) {
        case Formats.PlainActionQuoteSpeech: {
            const parts = input.split(/(".*?"|\n+)/g).filter(Boolean)
            for (const part of parts) {
                if (!part.trim()) {
                    textData.push({ type: 'none', content: part })
                } else if (part.startsWith('"') && part.endsWith('"')) {
                    const clean = part.replaceAll('"', '')
                    const cleanarr = clean.split(' ')
                    if (cleanarr.length > 1 || /[.!?]$/.test(clean))
                        textData.push({ type: 'speech', content: part.slice(1, -1).trim() })
                    else textData.push({ type: 'none', content: part })
                } else {
                    textData.push({ type: 'action', content: part.trim() })
                }
            }
            break
        }
        case Formats.AsteriskActionPlainSpeech: {
            const parts = input.split(/(\*[^*]*\*|\n+)/g).filter(Boolean)
            for (const part of parts) {
                if (part.trim()) {
                    textData.push({
                        type: part.includes('*') ? 'action' : 'speech',
                        content: part.replace(/\*/g, '').trim(),
                    })
                } else if (part.includes('\n')) {
                    textData.push({
                        type: 'none',
                        content: part,
                    })
                }
            }
            break
        }
        case Formats.AsteriskActionQuoteSpeech: {
            const parts = input.split(/(\*.*?\*|"[^"]*")/).filter(Boolean)

            for (const part of parts) {
                if (part.startsWith('*') && part.endsWith('*')) {
                    textData.push({ type: 'action', content: part.slice(1, -1).trim() })
                } else if (part.startsWith('"') && part.endsWith('"')) {
                    textData.push({ type: 'speech', content: part.slice(1, -1).trim() })
                } else if (part.includes('\n')) {
                    textData.push({ type: 'none', content: part })
                }
            }
            break
        }
    }

    return textData
}

const constructString = (input: TextData[], format: Formats): string => {
    let result = ''

    const formatters: Record<TextTypes, (text: TextData) => string> = {
        action: (text: TextData) => text.content,
        speech: (text: TextData) => text.content,
        none: (text: TextData) => text.content,
    }

    switch (format) {
        case Formats.PlainActionQuoteSpeech:
            formatters.action = (data) => `${data.content} `
            formatters.speech = (data) => `"${data.content}" `
            break

        case Formats.AsteriskActionPlainSpeech:
            formatters.action = (data) => `*${data.content}* `
            formatters.speech = (data) => `${data.content} `
            formatters.none = (data) =>
                data.content.endsWith('"') ? data.content + ' ' : data.content
            break

        case Formats.AsteriskActionQuoteSpeech:
            formatters.action = (data) => `*${data.content}* `
            formatters.speech = (data) => `"${data.content}" `
            break
    }

    input.forEach((data) => {
        result += formatters[data.type](data)
    })

    return result.trim()
}

export const convertToFormat = (input: string, targetFormat: Formats) => {
    if (targetFormat === Formats.None) return input
    const sourceFormat = detectFormat(input)
    if (sourceFormat === targetFormat || sourceFormat === Formats.None) return input
    const textdata = destructString(input, sourceFormat)
    return constructString(textdata, targetFormat)
}

export const convertToFormatInstruct = (input: string) => {
    const formatType = Instructs.useInstruct.getState().data?.format_type
    if (!formatType || formatType === 0) return input
    return convertToFormat(input, formatType)
}
