import { View, type ViewProps, type ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'

import useAnimatedActiveColorStyle from '@lib/hooks/AnimatedActiveColorStyle'
import { Theme } from '@lib/theme/ThemeManager'

export type ListCardAppearance = { active?: boolean; warning?: boolean }

export const useListCardStyle = ({ active = true, warning = false }: ListCardAppearance) => {
    const { spacing, borderWidth, color } = Theme.useTheme()
    const animatedStyle = useAnimatedActiveColorStyle({
        deactiveColor: warning ? color.warning._500 : color.neutral._200,
        activeColor: warning ? color.warning._500 : color.primary._500,
        active,
    })
    const baseStyle: ViewStyle = {
        borderWidth: borderWidth.m,
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        borderRadius: spacing.xl,
    }
    return [baseStyle, animatedStyle]
}

export const ListCardSection = ({ style, ...props }: ViewProps) => (
    <View
        {...props}
        style={[
            { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', flexShrink: 1 },
            style,
        ]}
    />
)

const ListCard = ({ active, warning, style, ...props }: ViewProps & ListCardAppearance) => {
    const cardStyle = useListCardStyle({ active, warning })
    return <Animated.View {...props} style={[cardStyle, style]} />
}

export default ListCard
