import type { ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'

import { CHAT_CONTROL_GAP } from '@lib/constants/ChatControls'

// Message and playback controls share panel styling with notices.
export { default as ChatControlPanel } from './FloatingPanel'

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
