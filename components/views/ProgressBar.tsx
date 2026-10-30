import { View, type StyleProp, type ViewStyle } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

export type ProgressBarProps = {
    /** Percentage from 0 to 100. */
    progress: number
    height?: number
    color?: string
    style?: StyleProp<ViewStyle>
}

const ProgressBar = ({ progress, height = 8, color: fill, style }: ProgressBarProps) => {
    const { color } = Theme.useTheme()
    return (
        <View
            style={[
                {
                    height,
                    borderRadius: height / 2,
                    backgroundColor: color.neutral._300,
                    overflow: 'hidden',
                },
                style,
            ]}>
            <View
                style={{
                    height: '100%',
                    width: `${Math.max(0, Math.min(100, progress))}%`,
                    backgroundColor: fill ?? color.primary._500,
                }}
            />
        </View>
    )
}

export default ProgressBar
