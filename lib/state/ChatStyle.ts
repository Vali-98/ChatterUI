import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'

export namespace ChatStyle {
    export const WEIGHTS = ['thin', 'normal', 'bold', 'bolder'] as const
    export const SIZES = ['s', 'm', 'l', 'xl', '2xl'] as const
    export const MIN_FONT_SIZE = 8
    export type TextWeight = (typeof WEIGHTS)[number]
    export type FontSize = (typeof SIZES)[number]

    export const sizeModifierMap: Record<FontSize, number> = {
        s: -2,
        m: 0,
        l: 2,
        xl: 4,
        '2xl': 6,
    }

    export const weightModifierMap: Record<TextWeight, number> = {
        thin: -100,
        normal: 0,
        bold: 100,
        bolder: 200,
    }

    type ChatTextStyleStateProps = {
        textWeight: TextWeight
        fontSize: FontSize
        setTextWeight: (mode: TextWeight) => void
        setFontSize: (size: FontSize) => void
        getModifiedFontSize: (size: number) => number
    }

    export const useChatStyle = create<ChatTextStyleStateProps>()(
        persist(
            (set, get) => ({
                textWeight: 'normal',
                fontSize: 'm',
                setTextWeight: (textWeight) => set({ textWeight }),
                setFontSize: (fontSize) => set({ fontSize }),
                getModifiedFontSize: (size) => {
                    return Math.max(MIN_FONT_SIZE, sizeModifierMap?.[get().fontSize] ?? 0 + size)
                },
            }),
            {
                name: Storage.ChatStyle,
                storage: createMMKVStorage(),
                version: 1,
            }
        )
    )
}
