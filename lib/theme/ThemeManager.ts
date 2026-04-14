import { useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import { Storage } from '@lib/enums/Storage'
import { Logger } from '@lib/state/Logger'
import { createMMKVStorage } from '@lib/storage/MMKV'

import { DefaultColorSchemes, ThemeColor, themeColorSchemaV1 } from './ThemeColor'

interface ColorStateProps {
    useSystemDarkMode: boolean
    setUseSystemDarkMode: (b: boolean) => void
    customColors: ThemeColor[]
    addCustomColor: (colorScheme: ThemeColor) => void
    removeColorScheme: (index: number) => void
    color: ThemeColor
    lightColor: ThemeColor
    darkColor: ThemeColor
    setColor: (colorScheme: ThemeColor) => void
    setLightColor: (colorScheme: ThemeColor) => void
    setDarkColor: (colorScheme: ThemeColor) => void
}

export const useGlobalStyles = () => {
    // todo: find common items to add here
    // const { color, spacing, borderWidth, borderRadius } = Theme.useTheme()
}

export namespace Theme {
    export const useColorState = create<ColorStateProps>()(
        persist(
            (set, get) => ({
                useSystemDarkMode: true,
                color: DefaultColorSchemes.lavenderDark,
                darkColor: DefaultColorSchemes.lavenderDark,
                lightColor: DefaultColorSchemes.lavenderLight,
                setColor: (color) => {
                    set({ color: color })
                },
                setLightColor: (color) => {
                    set({ lightColor: color })
                },
                setDarkColor: (color) => {
                    set({ darkColor: color })
                },
                setUseSystemDarkMode: (b) => {
                    set({ useSystemDarkMode: b })
                },

                customColors: [],
                addCustomColor: (colorScheme: ThemeColor) => {
                    const validation = themeColorSchemaV1.safeParse(colorScheme)

                    if (!validation.success) {
                        Logger.errorToast(`Schema validation failed!`)
                        Logger.error(
                            'The format of the imported JSON does not match the required color scheme:\n' +
                                validation.error.issues
                                    .map((issue) => `${issue.path.join('.')} - ${issue.message}`)
                                    .join('\n')
                        )
                        return
                    }

                    if (
                        get().customColors.some((item) => item.name === colorScheme.name) ||
                        DefaultColorSchemes.schemes.some((item) => item.name === colorScheme.name)
                    ) {
                        Logger.errorToast('Color Name Already Used')
                        return
                    }
                    set({ customColors: [...get().customColors, colorScheme] })
                    Logger.info(`Successfully imported ${colorScheme.name}`)
                },
                removeColorScheme: (index: number) => {
                    if (index > get().customColors.length) {
                        return
                    }
                    const colors = [...get().customColors]
                    const removedArr = colors.splice(index, 1)
                    const removed = removedArr?.[0]
                    let color = get().color
                    let lightColor = get().lightColor
                    let darkColor = get().darkColor
                    if (removed) {
                        if (removed.name === color.name) color = DefaultColorSchemes.lavenderDark
                        if (removed.name === lightColor.name)
                            lightColor = DefaultColorSchemes.lavenderLight
                        if (removed.name === darkColor.name)
                            darkColor = DefaultColorSchemes.lavenderDark
                    }
                    set({
                        customColors: colors,
                        color: color,
                        lightColor: lightColor,
                        darkColor: darkColor,
                    })
                },
            }),
            {
                name: Storage.ColorState,
                storage: createMMKVStorage(),
                version: 2,
                partialize: (state) => ({
                    color: state.color,
                    customColors: state.customColors,
                    darkColor: state.darkColor,
                    lightColor: state.lightColor,
                    useSystemDarkMode: state.useSystemDarkMode,
                }),
                migrate: (persistedState: any, version) => {
                    if (version === 1) {
                        persistedState.darkColor = DefaultColorSchemes.lavenderDark
                        persistedState.lightColor = DefaultColorSchemes.lavenderLight
                        persistedState.useSystemDarkMode = false
                    }
                    return persistedState
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
        const systemTheme = useColorScheme()
        const { selectedColor, useSystemDarkMode, lightColor, darkColor } = useColorState(
            useShallow((state) => ({
                selectedColor: state.color,
                useSystemDarkMode: state.useSystemDarkMode,
                lightColor: state.lightColor,
                darkColor: state.darkColor,
            }))
        )

        const color = useSystemDarkMode
            ? systemTheme === 'dark'
                ? darkColor
                : lightColor
            : selectedColor

        return useMemo(
            () => ({ color, spacing, font, borderWidth, fontSize, borderRadius }),
            [color]
        )
    }
}
