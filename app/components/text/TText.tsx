import { Theme } from '@lib/theme/ThemeManager'
import React, { useMemo } from 'react'
import { StyleSheet, Text, TextProps } from 'react-native'

type FontColor = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

interface TTextProps extends TextProps {
    color?: FontColor
}
const styles = StyleSheet.create({
    text: {
        fontWeight: 'normal',
    },
})

const TText: React.FC<TTextProps> = ({ color = '100', children, style, ...props }) => {
    const theme = Theme.useTheme()
    const colorOverride = useMemo(
        () => ({
            color: theme.color.text[`_${color}`],
        }),
        [color]
    )
    return (
        <Text style={[colorOverride, styles.text, style]} {...props}>
            {children}
        </Text>
    )
}

export default TText
