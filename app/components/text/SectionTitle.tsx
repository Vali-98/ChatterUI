import React, { ReactNode } from 'react'
import { TextProps, TextStyle } from 'react-native'

import TText from './TText'
import { Theme } from '@lib/theme/ThemeManager'

const SectionTitle = ({
    children,
    style = undefined,
    ...props
}: {
    props?: TextProps
    children?: ReactNode
    style?: TextStyle
}) => {
    const { color } = Theme.useTheme()
    return (
        <TText
            {...props}
            style={{
                color: color.text._100,
                paddingTop: 3,
                fontSize: 16,
                paddingBottom: 6,
                marginBottom: 8,
                borderBottomWidth: 1,
                borderColor: color.primary._300,
                ...style,
            }}>
            {children}
        </TText>
    )
}

export default SectionTitle
