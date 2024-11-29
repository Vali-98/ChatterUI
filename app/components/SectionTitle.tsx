import { Style } from 'constants/Global'
import React, { ReactNode } from 'react'
import { Text } from 'react-native'

const SectionTitle = ({ children }: { children: ReactNode }) => {
    return (
        <Text
            style={{
                color: Style.getColor('primary-text1'),
                paddingTop: 12,
                fontSize: 16,
                paddingBottom: 6,
                marginBottom: 8,
                borderBottomWidth: 1,
                borderColor: Style.getColor('primary-surface3'),
            }}>
            {children}
        </Text>
    )
}

export default SectionTitle
