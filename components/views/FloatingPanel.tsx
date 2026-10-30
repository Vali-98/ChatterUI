import { View, type ViewProps } from 'react-native'

import { CHAT_CONTROL_ELEVATION, CHAT_CONTROL_PADDING_VERTICAL } from '@lib/constants/ChatControls'
import { getShadowColor } from '@lib/theme/contrast'
import { Theme } from '@lib/theme/ThemeManager'

export type FloatingPanelVariant = 'neutral' | 'primary' | 'warning' | 'error'
export type FloatingPanelProps = ViewProps & { variant?: FloatingPanelVariant }

// Appearance only: notices and controls retain their own behavior and placement.
const FloatingPanel = ({ variant = 'primary', style, ...props }: FloatingPanelProps) => {
    const { color } = Theme.useTheme()
    const borderColours = {
        neutral: color.neutral._500,
        primary: color.primary._500,
        warning: color.warning._500,
        error: color.error._400,
    }
    return (
        <View
            {...props}
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    columnGap: 14,
                    paddingVertical: CHAT_CONTROL_PADDING_VERTICAL,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    elevation: CHAT_CONTROL_ELEVATION,
                    borderWidth: 1,
                    borderColor: borderColours[variant],
                    backgroundColor: color.neutral._100 + 'ee',
                    boxShadow: [
                        {
                            offsetX: 1,
                            offsetY: 1,
                            color: getShadowColor(color.shadow),
                            spreadDistance: 1,
                            blurRadius: 4,
                        },
                    ],
                },
                style,
            ]}
        />
    )
}
export default FloatingPanel
