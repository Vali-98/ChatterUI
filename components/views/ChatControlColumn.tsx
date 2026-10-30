import type { ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'

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
        style={[{ alignItems: 'flex-end', rowGap: 8 }, style]}>
        {children}
    </View>
)
