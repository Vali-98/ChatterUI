import type { ViewStyle } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

export const useChatBubbleStyle = (): ViewStyle => {
    const { color, borderRadius } = Theme.useTheme()
    return {
        backgroundColor: color.neutral._200,
        borderColor: color.neutral._200,
        borderWidth: 1,
        minHeight: 40,
        borderRadius: borderRadius.m,
        shadowColor: color.shadow,
        boxShadow: [
            { offsetX: 1, offsetY: 1, spreadDistance: 2, color: color.shadow, blurRadius: 4 },
        ],
    }
}
