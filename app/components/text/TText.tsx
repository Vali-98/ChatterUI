import { Theme } from '@lib/theme/ThemeManager'
import React, { useMemo } from 'react'
import { Text, TextProps, TextStyle } from 'react-native'

type FontColor = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

interface TTextProps extends TextProps {
    color?: FontColor
}

const TText: React.FC<TTextProps> = ({ color = '500', children, style, ...props }) => {
    const fontWeightOverride = useMemo(
        () => ({ fontWeight: (style as TextStyle)?.fontWeight ?? '500' }),
        [style]
    )

    const theme = Theme.useTheme()
    const colorOverride = useMemo(
        () => ({ color: (style as TextStyle)?.color ?? theme.color.text[`_${color}`] }),
        [color]
    )
    return (
        <Text style={[style, fontWeightOverride, colorOverride]} {...props}>
            {children}
        </Text>
    )
}

export default TText
