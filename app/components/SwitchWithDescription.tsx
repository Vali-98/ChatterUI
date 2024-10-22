import { Style } from '@globals'
import React from 'react'
import { Text, View } from 'react-native'

import SwitchComponent, { SwitchTitleProps } from './SwitchTitle'

interface SwitchWithDescriptionProps extends SwitchTitleProps {
    description: string
}

const SwitchWithDescription: React.FC<SwitchWithDescriptionProps> = ({ description, ...rest }) => {
    return (
        <View>
            <SwitchComponent {...rest} />
            <Text
                style={{
                    color: Style.getColor('primary-text2'),
                    paddingBottom: 2,
                    marginBottom: 8,
                }}>
                {description}
            </Text>
        </View>
    )
}

export default SwitchWithDescription
