import { mmkvStorage } from '@lib/storage/MMKV'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { ColorScheme, DefaultColorSchemes } from './ThemeColor'

interface ColorStateProps {
    color: ColorScheme
    setColor: (colorScheme: ColorScheme) => void
}

export namespace Theme {
    export const useColorState = create<ColorStateProps>()(
        persist(
            (set, get) => ({
                color: DefaultColorSchemes.navyBlueDark,
                setColor: (color) => {
                    set((state) => ({ ...state, color: color }))
                },
            }),
            {
                name: 'colorscheme-storage',
                storage: createJSONStorage(() => mmkvStorage),
                partialize: (state) => ({ color: state.color }),
                version: 1,
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
    // TODO: Research fonts
    const useFontState = () => {
        return ''
    }

    export const useTheme = () => {
        const color = useColorState((state) => state.color)
        const spacing = useSpacingState()
        const font = useFontState()
        const border = useSpacingState()

        return { color, spacing, font, border }
    }
}
