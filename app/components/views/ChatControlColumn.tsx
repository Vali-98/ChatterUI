import type { ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'

import {
    CHAT_CONTROL_GAP,
    CHAT_CONTROL_PADDING_VERTICAL,
    CHAT_CONTROL_ELEVATION,
} from '@lib/constants/ChatControls'
import { Theme } from '@lib/theme/ThemeManager'

// Shared appearance/spacing only. Playback and message actions retain independent ownership.
export const ChatControlPanel = ({ style, ...props }: ViewProps) => {
    const { color } = Theme.useTheme()
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
                    borderColor: color.primary._500,
                    backgroundColor: color.neutral._100 + 'ee',
                    boxShadow: [
                        {
                            offsetX: 1,
                            offsetY: 1,
                            color: color.shadow,
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
export const ChatControlColumn = ({
    children,
    style,
    ...props
}: ViewProps & { children?: ReactNode }) => (
    <View
        {...props}
        pointerEvents="box-none"
        style={[{ alignItems: 'flex-end', rowGap: CHAT_CONTROL_GAP }, style]}>
        {children}
    </View>
)
