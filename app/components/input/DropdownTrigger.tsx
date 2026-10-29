import Octicons, { type OcticonsIconName } from '@react-native-vector-icons/octicons/static'
import { Pressable, type StyleProp, Text, type ViewStyle } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

const DropdownTrigger = ({
    label,
    placeholder,
    onPress,
    disabled,
    style,
    icon = 'chevron-down',
    iconPosition = 'right',
    iconSize = 18,
}: {
    label?: string
    placeholder: string
    onPress: () => void
    disabled?: boolean
    style?: StyleProp<ViewStyle>
    icon?: OcticonsIconName | null
    iconPosition?: 'left' | 'right'
    iconSize?: number
}) => {
    const { color } = Theme.useTheme()
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !!disabled }}
            disabled={disabled}
            onPress={onPress}
            style={[
                {
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 8,
                    backgroundColor: color.primary._300,
                    flexDirection: iconPosition === 'right' ? 'row' : 'row-reverse',
                    columnGap: 8,
                    opacity: disabled ? 0.5 : 1,
                },
                style,
            ]}>
            <Text
                style={{
                    flexShrink: 1,
                    color: label !== undefined ? color.text._100 : color.text._300,
                }}>
                {label ?? placeholder}
            </Text>
            {icon && <Octicons name={icon} color={color.primary._800} size={iconSize} />}
        </Pressable>
    )
}
export default DropdownTrigger
