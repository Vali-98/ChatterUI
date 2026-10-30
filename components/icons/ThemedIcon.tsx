import AntDesign, { type AntDesignIconName } from '@react-native-vector-icons/ant-design/static'
import MaterialIcons, {
    type MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static'
import Octicons, { type OcticonsIconName } from '@react-native-vector-icons/octicons/static'
import { StyleSheet, View, type ColorValue, type StyleProp, type TextStyle } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

type FamilyIcon =
    | { family?: 'antdesign'; name: AntDesignIconName }
    | { family: 'material'; name: MaterialIconsIconName }
    | { family: 'octicons'; name: OcticonsIconName }

export type SimpleIconName = AntDesignIconName | FamilyIcon
export type IconName = AntDesignIconName | (FamilyIcon & { subIcon?: SimpleIconName })

const Glyph = ({
    icon,
    size,
    color,
    style,
}: {
    icon: SimpleIconName
    size: number
    color: ColorValue
    style?: StyleProp<TextStyle>
}) => {
    const definition =
        typeof icon === 'string' ? { family: 'antdesign' as const, name: icon } : icon
    switch (definition.family) {
        case 'material':
            return <MaterialIcons name={definition.name} size={size} color={color} style={style} />
        case 'octicons':
            return <Octicons name={definition.name} size={size} color={color} style={style} />
        default:
            return <AntDesign name={definition.name} size={size} color={color} style={style} />
    }
}

const ThemedIcon = ({
    iconName,
    size: customSize,
    color,
    backgroundColor,
    style,
}: {
    iconName: IconName
    size?: number
    color?: ColorValue
    backgroundColor?: ColorValue
    style?: StyleProp<TextStyle>
}) => {
    const { color: themeColor, iconSize } = Theme.useTheme()
    const size = customSize ?? iconSize.buttonLabel
    const foreground = color ?? themeColor.text._200
    const subIcon = typeof iconName === 'object' ? iconName.subIcon : undefined
    if (!subIcon) return <Glyph icon={iconName} size={size} color={foreground} style={style} />
    const subSize = Math.round(size * 0.5)
    return (
        <View style={{ width: size, height: size }}>
            <Glyph icon={iconName} size={size} color={foreground} style={style} />
            <View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    borderRadius: 3,
                    backgroundColor: backgroundColor ?? themeColor.neutral._100,
                }}>
                <Glyph
                    icon={subIcon}
                    size={subSize}
                    color={StyleSheet.flatten(style)?.color ?? foreground}
                />
            </View>
        </View>
    )
}

export default ThemedIcon
