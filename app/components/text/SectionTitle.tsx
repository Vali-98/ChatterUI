import { Theme } from '@lib/theme/ThemeManager'
import React, { ReactNode } from 'react'
import { TextProps, TextStyle } from 'react-native'

import TText from './TText'

const SectionTitle = ({
    children,
    style = undefined,
    ...props
}: {
    props?: TextProps
    children?: ReactNode
    style?: TextStyle
}) => {
    const { color, spacing } = Theme.useTheme()
    return (
        <TText
            {...props}
            style={{
                color: color.text._100,
                fontSize: 16,
                paddingBottom: spacing.m,
                borderBottomWidth: 1,
                borderColor: color.neutral._500,
                ...style,
            }}>
            {children}
        </TText>
    )
}

export default SectionTitle
