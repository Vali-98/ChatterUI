import { t } from 'i18next'
import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import { Storage } from '@lib/constants/storageKeys'
import { Logger } from '@lib/state/Logger'
import { createMMKVStorage } from '@lib/storage/MMKV'

import {
    DefaultColorSchemes,
    ThemeColor,
    themeImportSchema,
    parseTheme,
    getThemeContrastWarnings,
} from './ThemeColor'

const PreviewColorContext = createContext<ThemeColor | undefined>(undefined)

export const ThemePreview = ({ color, children }: { color: ThemeColor; children: ReactNode }) =>
    createElement(PreviewColorContext.Provider, { value: color }, children)

interface ColorStateProps {
    useSystemDarkMode: boolean
    setUseSystemDarkMode: (b: boolean) => void
    customColors: ThemeColor[]
    addCustomColor: (colorScheme: unknown) => void
    removeColorScheme: (index: number) => void
    colorName: string
    lightColorName: string
    darkColorName: string
    setColor: (colorScheme: ThemeColor) => void
    setLightColor: (colorScheme: ThemeColor) => void
    setDarkColor: (colorScheme: ThemeColor) => void
}

export const useGlobalStyles = () => {
    // todo: find common items to add here
    // const { color, spacing, borderWidth, borderRadius } = Theme.useTheme()
}

export namespace Theme {
    export const resolveColor = (
        name: string,
        customColors: ThemeColor[],
        fallback = DefaultColorSchemes.lavenderDark
    ): ThemeColor =>
        DefaultColorSchemes.schemes.find((scheme) => scheme.name === name) ??
        customColors.find((scheme) => scheme.name === name) ??
        fallback

    export const useColorState = create<ColorStateProps>()(
        persist(
            (set, get) => ({
                useSystemDarkMode: true,
                colorName: DefaultColorSchemes.lavenderDark.name,
                darkColorName: DefaultColorSchemes.lavenderDark.name,
                lightColorName: DefaultColorSchemes.lavenderLight.name,
                setColor: (color) => {
                    set({ colorName: color.name })
                },
                setLightColor: (color) => {
                    set({ lightColorName: color.name })
                },
                setDarkColor: (color) => {
                    set({ darkColorName: color.name })
                },
                setUseSystemDarkMode: (b) => {
                    set({ useSystemDarkMode: b })
                },

                customColors: [],
                addCustomColor: (input: unknown) => {
                    const validation = themeImportSchema.safeParse(input)

                    if (!validation.success) {
                        Logger.errorToast(t('common.errors.schemaValidationFailed'))
                        Logger.error(
                            'The format of the imported JSON does not match the required color scheme:\n' +
                                validation.error.issues
                                    .map((issue) => `${issue.path.join('.')} - ${issue.message}`)
                                    .join('\n')
                        )
                        return
                    }

                    const colorScheme = parseTheme(validation.data)
                    if (
                        get().customColors.some((item) => item.name === colorScheme.name) ||
                        DefaultColorSchemes.schemes.some((item) => item.name === colorScheme.name)
                    ) {
                        Logger.errorToast(t('settings.colors.error.colorNameAlreadyUsed'))
                        return
                    }
                    set({ customColors: [...get().customColors, colorScheme] })
                    Logger.info(`Successfully imported ${colorScheme.name}`)
                    const warnings = getThemeContrastWarnings(colorScheme)
                    if (warnings.length) {
                        Logger.warnToast(
                            t('settings.colors.lowContrast', {
                                pairs: warnings.map((warning) => warning.pair).join(', '),
                            })
                        )
                    }
                },
                removeColorScheme: (index: number) => {
                    if (index < 0 || index >= get().customColors.length) {
                        return
                    }
                    const colors = [...get().customColors]
                    const removedArr = colors.splice(index, 1)
                    const removed = removedArr?.[0]
                    let colorName = get().colorName
                    let lightColorName = get().lightColorName
                    let darkColorName = get().darkColorName
                    if (removed) {
                        if (removed.name === colorName)
                            colorName = DefaultColorSchemes.lavenderDark.name
                        if (removed.name === lightColorName)
                            lightColorName = DefaultColorSchemes.lavenderLight.name
                        if (removed.name === darkColorName)
                            darkColorName = DefaultColorSchemes.lavenderDark.name
                    }
                    set({
                        customColors: colors,
                        colorName,
                        lightColorName,
                        darkColorName,
                    })
                },
            }),
            {
                name: Storage.ColorState,
                storage: createMMKVStorage(),
                version: 5,
                partialize: (state) => ({
                    colorName: state.colorName,
                    customColors: state.customColors,
                    darkColorName: state.darkColorName,
                    lightColorName: state.lightColorName,
                    useSystemDarkMode: state.useSystemDarkMode,
                }),
                migrate: (persistedState: any, version) => {
                    if (version === 1) {
                        persistedState.darkColor = DefaultColorSchemes.lavenderDark
                        persistedState.lightColor = DefaultColorSchemes.lavenderLight
                        persistedState.useSystemDarkMode = false
                    }
                    return {
                        colorName:
                            persistedState.colorName ??
                            persistedState.color?.name ??
                            DefaultColorSchemes.lavenderDark.name,
                        lightColorName:
                            persistedState.lightColorName ??
                            persistedState.lightColor?.name ??
                            DefaultColorSchemes.lavenderLight.name,
                        darkColorName:
                            persistedState.darkColorName ??
                            persistedState.darkColor?.name ??
                            DefaultColorSchemes.lavenderDark.name,
                        customColors:
                            version < 5
                                ? (persistedState.customColors ?? []).map(parseTheme)
                                : (persistedState.customColors ?? []),
                        useSystemDarkMode: persistedState.useSystemDarkMode ?? true,
                    }
                },
            }
        )
    )
    // TODO: State-ify
    const spacing = {
        xs: 2,
        s: 4,
        sm: 6,
        m: 8,
        l: 12,
        xl: 16,
        xl2: 24,
        xl3: 32,
    }

    const borderWidth = {
        s: 1,
        m: 2,
        l: 4,
        xl: 8,
    }

    const borderRadius = {
        s: 4,
        m: 8,
        l: 12,
        xl: 16,
        xl2: 24,
        xl3: 32,
    }

    const fontSize = { s: 12, m: 14, l: 16, xl: 18, xl2: 20, xl3: 24 }

    const font = ''

    export const useTheme = () => {
        const previewColor = useContext(PreviewColorContext)
        const systemTheme = useColorScheme()
        const { colorName, useSystemDarkMode, lightColorName, darkColorName, customColors } =
            useColorState(
                useShallow((state) => ({
                    colorName: state.colorName,
                    useSystemDarkMode: state.useSystemDarkMode,
                    lightColorName: state.lightColorName,
                    darkColorName: state.darkColorName,
                    customColors: state.customColors,
                }))
            )

        const color =
            previewColor ??
            resolveColor(
                useSystemDarkMode
                    ? systemTheme === 'dark'
                        ? darkColorName
                        : lightColorName
                    : colorName,
                customColors,
                useSystemDarkMode && systemTheme !== 'dark'
                    ? DefaultColorSchemes.lavenderLight
                    : DefaultColorSchemes.lavenderDark
            )

        return useMemo(
            () => ({
                color,
                spacing: spacing,
                font: font,
                borderWidth: borderWidth,
                fontSize: fontSize,
                borderRadius: borderRadius,
            }),
            [color]
        )
    }
}
