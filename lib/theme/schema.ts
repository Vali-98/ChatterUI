import { z } from 'zod'

import { getContrastRatio, getLuminance } from './contrast'

const hex = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
const scale = z.object({
    _100: hex,
    _200: hex,
    _300: hex,
    _400: hex,
    _500: hex,
    _600: hex,
    _700: hex,
    _800: hex,
    _900: hex,
})
type Scale = z.infer<typeof scale>
const optionalShades = scale.partial({ _600: true, _700: true, _800: true, _900: true })
const accent = optionalShades.extend({ _700: hex })
const bubble = z.object({ background: hex, border: hex }).partial()
const code = z.object({ background: hex, text: hex }).partial()
const markdown = z.object({
    quote: hex.optional(),
    emphasis: hex.optional(),
    link: hex.optional(),
    inlineCode: code.optional(),
    codeBlock: code
        .extend({ headerBackground: hex.optional(), headerText: hex.optional() })
        .optional(),
    blockquote: code.extend({ border: hex.optional() }).optional(),
    table: z.object({ headerBackground: hex, background: hex, border: hex }).partial().optional(),
})

export const themeColorSchemaV1 = z.object({
    version: z.literal(1),
    name: z.string(),
    quote: hex,
    shadow: hex,
    primary: scale,
    neutral: scale,
    error: scale,
    text: scale,
    warning: hex.optional(),
})
export const themeColorSchemaV2 = z.object({
    version: z.literal(2),
    name: z.string(),
    mode: z.enum(['light', 'dark']),
    primary: accent,
    neutral: optionalShades,
    error: accent,
    text: optionalShades,
    warning: scale.partial().optional(),
    shadow: z.object({ color: hex, opacity: z.number().min(0).max(1) }),
    chat: z
        .object({
            text: hex.optional(),
            metadata: hex.optional(),
            user: bubble.optional(),
            character: bubble.optional(),
            markdown: markdown.optional(),
            section: z
                .object({ background: hex, headerBackground: hex, headerText: hex, border: hex })
                .partial()
                .optional(),
        })
        .optional(),
    context: z.object({ system: hex, history: hex, reserved: hex, free: hex }).partial().optional(),
})
export const themeImportSchema = z.discriminatedUnion('version', [
    themeColorSchemaV1,
    themeColorSchemaV2,
])

const completeScale = (value: z.infer<typeof optionalShades>): Scale => ({
    ...value,
    _600: value._600 ?? value._500,
    _700: value._700 ?? value._400,
    _800: value._800 ?? value._700 ?? value._400,
    _900: value._900 ?? value._800 ?? value._700 ?? value._400,
})

// Resolve once on import/hydration. Consumers always receive complete colours.
const resolveTheme = (input: z.infer<typeof themeImportSchema>) => {
    const legacy = input.version === 1
    const primary = completeScale(input.primary)
    const neutral = completeScale(input.neutral)
    const text = completeScale(input.text)
    const error = completeScale(input.error)
    const chat = legacy ? undefined : input.chat
    const md = chat?.markdown
    const defaultWarning = legacy ? (input.warning ?? '#d4a017') : '#d4a017'
    const warning = Object.fromEntries(
        Object.keys(primary).map((key) => [key, defaultWarning])
    ) as Scale
    if (!legacy) Object.assign(warning, input.warning)
    return {
        version: 2 as const,
        name: input.name,
        mode: legacy
            ? getLuminance(neutral._100) > 0.5
                ? ('light' as const)
                : ('dark' as const)
            : input.mode,
        primary,
        neutral,
        text,
        error,
        warning,
        shadow: legacy ? { color: input.shadow, opacity: 1 } : input.shadow,
        chat: {
            text: chat?.text ?? text._100,
            metadata: chat?.metadata ?? text._400,
            user: { background: neutral._200, border: neutral._200, ...chat?.user },
            character: { background: neutral._200, border: neutral._200, ...chat?.character },
            markdown: {
                quote: md?.quote ?? (legacy ? input.quote : text._300),
                emphasis: md?.emphasis ?? text._400,
                link: md?.link ?? primary._700,
                inlineCode: {
                    background: neutral._200,
                    text: chat?.text ?? text._100,
                    ...md?.inlineCode,
                },
                codeBlock: {
                    background: neutral._100,
                    text: text._300,
                    headerBackground: neutral._200,
                    headerText: text._300,
                    ...md?.codeBlock,
                },
                blockquote: {
                    background: neutral._200,
                    text: text._400,
                    border: primary._500,
                    ...md?.blockquote,
                },
                table: {
                    headerBackground: neutral._300,
                    background: neutral._200,
                    border: neutral._300,
                    ...md?.table,
                },
            },
            section: {
                background: neutral._100,
                headerBackground: neutral._300,
                headerText: text._400,
                border: neutral._300,
                ...chat?.section,
            },
        },
        context: {
            system: '#5b9bd5',
            history: primary._500,
            reserved: '#d4a34b',
            free: neutral._300,
            ...(!legacy ? input.context : undefined),
        },
    }
}

export type ThemeColor = ReturnType<typeof resolveTheme>
export const parseTheme = (input: unknown): ThemeColor =>
    resolveTheme(themeImportSchema.parse(input))

export const getThemeContrastWarnings = (theme: ThemeColor) => {
    const warnings: { pair: string; ratio: number }[] = []
    const check = (pair: string, foreground: string, background: string) => {
        const ratio = getContrastRatio(foreground, background)
        if (ratio < 4.5) warnings.push({ pair, ratio })
    }
    const { chat } = theme
    for (const speaker of ['character', 'user', 'section'] as const) {
        for (const [label, foreground] of Object.entries({
            text: chat.text,
            quote: chat.markdown.quote,
            emphasis: chat.markdown.emphasis,
            link: chat.markdown.link,
        })) {
            check(`chat.${speaker}/${label}`, foreground, chat[speaker].background)
        }
    }
    check('chat.section/header', chat.section.headerText, chat.section.headerBackground)
    check('chat.metadata', chat.metadata, theme.neutral._100)
    check('chat.inlineCode', chat.markdown.inlineCode.text, chat.markdown.inlineCode.background)
    check('chat.codeBlock', chat.markdown.codeBlock.text, chat.markdown.codeBlock.background)
    check(
        'chat.codeBlock/header',
        chat.markdown.codeBlock.headerText,
        chat.markdown.codeBlock.headerBackground
    )
    check('chat.blockquote', chat.markdown.blockquote.text, chat.markdown.blockquote.background)
    check('chat.table/header', chat.text, chat.markdown.table.headerBackground)
    check('chat.table/text', chat.text, chat.markdown.table.background)
    return warnings
}
