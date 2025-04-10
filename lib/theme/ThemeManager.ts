import { Storage } from '@lib/enums/Storage'
import { Logger } from '@lib/state/Logger'
import { mmkvStorage } from '@lib/storage/MMKV'
import { setBackgroundColorAsync } from 'expo-system-ui'
import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { DefaultColorSchemes, ThemeColor, themeColorSchemaV1 } from './ThemeColor'

interface ColorStateProps {
    customColors: ThemeColor[]
    addCustomColor: (colorScheme: ThemeColor) => void
    removeColorScheme: (index: number) => void
    color: ThemeColor
    setColor: (colorScheme: ThemeColor) => void
}

export const useGlobalStyles = () => {
    // todo: find common items to add here
    const { color, spacing, borderWidth, borderRadius } = Theme.useTheme()
}

export namespace Theme {
    export const useColorState = create<ColorStateProps>()(
        persist(
            (set, get) => ({
                color: DefaultColorSchemes.lavenderDark,
                setColor: (color) => {
                    setBackgroundColorAsync(color.neutral._100)
                    set((state) => ({ ...state, color: color }))
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
                    set((state) => ({
                        ...state,
                        customColors: [...get().customColors, colorScheme],
                    }))
                    Logger.info(`Successfully imported ${colorScheme.name}`)
                },
                removeColorScheme: (index: number) => {
                    if (index > get().customColors.length) {
                        return
                    }
                    const colors = [...get().customColors]
                    colors.splice(index, 1)
                    set((state) => ({
                        ...state,
                        customColors: colors,
                    }))
                },
            }),
            {
                name: Storage.ColorState,
                storage: createJSONStorage(() => mmkvStorage),
                version: 1,
                partialize: (state) => ({ color: state.color, customColors: state.customColors }),
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

    export const useTheme = () => {
        const color = useColorState((state) => state.color)
        const font = ''

        return useMemo(
            () => ({ color, spacing, font, borderWidth, fontSize, borderRadius }),
            [color]
        )
    }
}
