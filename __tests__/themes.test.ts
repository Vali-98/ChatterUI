import { DefaultColorSchemes, getThemeContrastWarnings, parseTheme } from '../lib/theme/ThemeColor'
import { Theme } from '../lib/theme/ThemeManager'

jest.mock('../lib/state/Logger', () => ({
    Logger: { info: jest.fn(), warnToast: jest.fn(), errorToast: jest.fn(), error: jest.fn() },
}))
jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))

const source = DefaultColorSchemes.lavenderLight
const legacy = {
    version: 1,
    name: 'My theme',
    primary: source.primary,
    neutral: source.neutral,
    text: source.text,
    error: source.error,
    quote: '#123456',
    shadow: '#abc',
    warning: '#876543',
}

test('v1 palettes and colours migrate by analogy without recolouring', () => {
    const theme = parseTheme(legacy)
    expect(theme.version).toBe(2)
    expect(theme.mode).toBe('light')
    for (const key of ['primary', 'neutral', 'text', 'error'] as const)
        expect(theme[key]).toEqual(legacy[key])
    expect(new Set(Object.values(theme.warning))).toEqual(new Set([legacy.warning]))
    expect(theme.shadow).toEqual({ color: legacy.shadow, opacity: 1 })
    expect(theme.chat.markdown.quote).toBe(legacy.quote)
    expect(theme.chat.character.background).toBe(legacy.neutral._200)
    expect(theme.chat.user.background).toBe(legacy.neutral._200)
    expect(theme.chat.text).toBe(legacy.text._100)
})

test('v2 accepts optional shade omissions and resolves nested chat defaults', () => {
    const { _600, _700, _800, _900, ...text } = source.text
    const theme = parseTheme({
        ...source,
        text,
        chat: {
            text: '#123456',
            user: { background: '#eeeeee' },
            markdown: { emphasis: '#765432', codeBlock: { background: '#111111' } },
            section: { headerText: '#abcdef' },
        },
    })
    expect(theme.text._700).toBe(text._400)
    expect(theme.chat.text).toBe('#123456')
    expect(theme.chat.user.background).toBe('#eeeeee')
    expect(theme.chat.user.border).toBe(source.neutral._200)
    expect(theme.chat.markdown.emphasis).toBe('#765432')
    expect(theme.chat.markdown.inlineCode.text).toBe('#123456')
    expect(theme.chat.markdown.codeBlock.background).toBe('#111111')
    expect(theme.chat.markdown.codeBlock.text).toBe(source.text._300)
    expect(theme.chat.section.headerText).toBe('#abcdef')
    expect(parseTheme(theme)).toEqual(theme)
})

test('contrast checks flag both speakers and section/code text without altering colours', () => {
    const theme = parseTheme({
        ...source,
        chat: {
            text: '#ffffff',
            user: { background: '#ffffff' },
            character: { background: '#ffffff' },
            section: { headerText: '#ffffff', headerBackground: '#ffffff' },
            markdown: { codeBlock: { text: '#ffffff', background: '#ffffff' } },
        },
    })
    const pairs = getThemeContrastWarnings(theme).map((item) => item.pair)
    expect(pairs).toEqual(
        expect.arrayContaining([
            'chat.user/text',
            'chat.character/text',
            'chat.section/header',
            'chat.codeBlock',
        ])
    )
    expect(theme.chat.text).toBe('#ffffff')
})

test('saved custom palettes migrate without losing name selections or definitions', () => {
    const migrate = Theme.useColorState.persist.getOptions().migrate!
    for (const version of [2, 4]) {
        const migrated: any = migrate(
            {
                color: legacy,
                lightColor: legacy,
                darkColor: DefaultColorSchemes.navyDark,
                colorName: legacy.name,
                lightColorName: legacy.name,
                darkColorName: DefaultColorSchemes.navyDark.name,
                customColors: [legacy],
                useSystemDarkMode: false,
            },
            version
        )
        expect(migrated.colorName).toBe(legacy.name)
        expect(migrated.lightColorName).toBe(legacy.name)
        expect(migrated.darkColorName).toBe(DefaultColorSchemes.navyDark.name)
        expect(migrated.useSystemDarkMode).toBe(false)
        expect(migrated.customColors).toEqual([parseTheme(legacy)])
        expect(migrated).not.toHaveProperty('color')
    }
})

test('low contrast warns after import and still saves the theme', () => {
    const { Logger } = require('../lib/state/Logger')
    const imported = { ...source, name: 'Low contrast', chat: { text: '#ffffff' } }
    Theme.useColorState.setState({ customColors: [] })
    Theme.useColorState.getState().addCustomColor(imported)
    expect(Theme.useColorState.getState().customColors[0].name).toBe(imported.name)
    expect(Logger.warnToast).toHaveBeenCalled()
})
