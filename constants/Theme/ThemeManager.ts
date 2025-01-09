import { mmkvStorage } from '@constants/MMKV'
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
            _2: 2,
            _4: 4,
            _6: 6,
            _8: 8,
            _12: 12,
            _16: 16,
            _24: 24,
            _32: 32,
            _48: 48,
            _64: 64,
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
