import { Entypo } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useState } from 'react'
import { Pressable, Text, TextStyle, View, ViewProps, ViewStyle } from 'react-native'

interface AccordionProps extends ViewProps {
    defaultState?: boolean
    label?: string
    labelStyle?: TextStyle
    accordionStyle?: ViewStyle
}

const Accordion: React.FC<AccordionProps> = ({
    defaultState = false,
    label = '',
    labelStyle = {},
    accordionStyle = {},
    children,
    ...rest
}) => {
    const { color, spacing, borderRadius } = Theme.useTheme()

    const [show, setShow] = useState(defaultState)
    return (
        <View {...rest}>
            <Pressable
                onPress={() => setShow(!show)}
                style={{
                    backgroundColor: color.primary._300,
                    paddingVertical: spacing.m,
                    borderTopLeftRadius: borderRadius.m,
                    borderTopRightRadius: borderRadius.m,
                    borderBottomLeftRadius: show ? 0 : borderRadius.m,
                    borderBottomRightRadius: show ? 0 : borderRadius.m,
                    paddingHorizontal: spacing.l,
                    justifyContent: 'space-between',
                    flexDirection: 'row',
                    alignItems: 'center',
                    ...accordionStyle,
                }}>
                <Text style={{ color: color.text._100, ...labelStyle }}>{label}</Text>
                <Entypo
                    name={show ? 'chevron-up' : 'chevron-down'}
                    color={color.primary._800}
                    size={18}
                />
            </Pressable>

            {show && (
                <View
                    style={{
                        backgroundColor: color.neutral._400,
                        paddingHorizontal: spacing.l,
                        paddingTop: spacing.l,
                        paddingBottom: spacing.m,
                        borderBottomLeftRadius: borderRadius.m,
                        borderBottomRightRadius: borderRadius.m,
                    }}>
                    {children}
                </View>
            )}
        </View>
    )
}

export default Accordion
