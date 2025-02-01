import React from 'react'
import { Trans } from 'react-i18next'
import { Text, TextProps } from 'react-native'

const TText: React.FC<TextProps> = ({ children, ...props }) => {
    return <Text {...props}>{children}</Text>
}

export default TText
