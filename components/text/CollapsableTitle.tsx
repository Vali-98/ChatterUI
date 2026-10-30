import AntDesign from '@react-native-vector-icons/ant-design/static'
import { ReactNode, useState } from 'react'
import { Pressable, TextStyle, View, ViewStyle } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

import TText from './TText'

const CollapsableTitle = ({
    children,
    title,
    visible = true,
    textStyle = {},
    containerStyle = {},
    defaultExpanded = true,
}: {
    title: string
    children?: ReactNode
    visible?: boolean
    textStyle?: TextStyle
    containerStyle?: ViewStyle
    defaultExpanded?: boolean
}) => {
    const { color, spacing, fontSize } = Theme.useTheme()
    const [open, setOpen] = useState(defaultExpanded)
    if (visible)
        return (
            <View style={containerStyle}>
                <View
                    style={[
                        {
                            paddingBottom: spacing.m,
                            marginBottom: spacing.m,
                            borderBottomWidth: 1,
                            borderColor: color.neutral._500,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        },
                    ]}>
                    <TText
                        style={[
                            {
                                color: color.text._100,
                                fontSize: fontSize.l,
                            },
                            textStyle,
                        ]}>
                        {title}
                    </TText>
                    <Pressable onPress={() => setOpen(!open)}>
                        <AntDesign
                            name={open ? 'up' : 'down'}
                            style={{
                                color: color.text._100,
                                fontSize: fontSize.l,
                            }}
                        />
                    </Pressable>
                </View>
                {open && children}
            </View>
        )
}

export default CollapsableTitle
