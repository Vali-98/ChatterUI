import { mmkvStorage } from '@lib/storage/MMKV'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ColorScheme, DefaultColorSchemes } from './ThemeColor'

interface ColorStateProps {
    color: ColorScheme
    setColor: (colorScheme: ColorScheme) => void
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
                    set((state) => ({ ...state, color: color }))
                },
            }),
            {
                name: 'colorscheme-storage',
                storage: createJSONStorage(() => mmkvStorage),
                version: 1,
                partialize: (state) => ({ color: state.color }),
            }
        )
    )
    // TODO: State-ify
    const useSpacingState = () => {
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
        return spacing
    }

    const useBorderWidthState = () => {
        return {
            s: 1,
            m: 2,
            l: 4,
            xl: 8,
        }
    }

    const useBorderRadiusState = () => {
        return {
            s: 4,
            m: 8,
            l: 12,
            xl: 16,
            xl2: 24,
            xl3: 32,
        }
    }
    // TODO: Research fonts
    const useFontState = () => {
        return ''
    }

    const useFontSize = () => {
        return { s: 12, m: 14, l: 16, xl: 18, xl2: 20, xl3: 24 }
    }

    export const useTheme = () => {
        const color = useColorState((state) => state.color)
        const spacing = useSpacingState()
        const font = useFontState()
        const borderWidth = useBorderWidthState()
        const borderRadius = useBorderRadiusState()
        const fontSize = useFontSize()
        return { color, spacing, font, borderWidth, fontSize, borderRadius }
    }
}
