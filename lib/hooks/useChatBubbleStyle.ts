import type { ViewStyle } from 'react-native'

import { getShadowColor } from '@lib/theme/contrast'
import { Theme } from '@lib/theme/ThemeManager'

export const useChatBubbleStyle = (isUser = false): ViewStyle => {
    const { color, borderRadius } = Theme.useTheme()
    const bubble = isUser ? color.chat.user : color.chat.character
    return {
        backgroundColor: bubble.background,
        borderColor: bubble.border,
        borderWidth: 1,
        minHeight: 40,
        borderRadius: borderRadius.m,
        shadowColor: getShadowColor(color.shadow),
        boxShadow: [
            {
                offsetX: 1,
                offsetY: 1,
                spreadDistance: 2,
                color: getShadowColor(color.shadow),
                blurRadius: 4,
            },
        ],
    }
}
