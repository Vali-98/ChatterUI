import { useCallback, type ReactNode, type Ref } from 'react'
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'

import ThemedButton, { type ThemedButtonProps } from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import { useUnfocusTextInput } from '@lib/hooks/UnfocusTextInput'
import { Theme } from '@lib/theme/ThemeManager'

export interface ThemedTextInputProps extends TextInputProps {
    ref?: Ref<TextInput>
    label?: string
    description?: string
    value: string
    toolbar?: ReactNode
    viewStyle?: StyleProp<ViewStyle>
    fieldStyle?: StyleProp<ViewStyle>
    autoUnfocus?: boolean
}

const Action = ({
    viewStyle,
    labelStyle,
    iconSize = 16,
    ...props
}: Omit<ThemedButtonProps, 'variant'>) => (
    <ThemedButton
        {...props}
        variant="tertiary"
        iconSize={iconSize}
        viewStyle={[{ paddingHorizontal: 8, paddingVertical: 4 }, viewStyle]}
        labelStyle={[{ fontSize: 12 }, labelStyle]}
    />
)

const ThemedTextInput = ({
    ref: forwardedRef,
    label,
    description,
    toolbar,
    viewStyle,
    fieldStyle,
    style,
    numberOfLines,
    multiline = false,
    autoUnfocus = true,
    ...props
}: ThemedTextInputProps) => {
    const { color } = Theme.useTheme()
    const ref = useUnfocusTextInput(autoUnfocus)
    const attachRef = useCallback(
        (input: TextInput | null) => {
            ref.current = input
            if (typeof forwardedRef === 'function') {
                const cleanup = forwardedRef(input)
                if (cleanup)
                    return () => {
                        ref.current = null
                        cleanup()
                    }
            } else if (forwardedRef) forwardedRef.current = input
        },
        [forwardedRef, ref]
    )
    const isMultiline = multiline || (numberOfLines !== undefined && numberOfLines > 1)
    const hasToolbar = toolbar !== undefined && toolbar !== null && toolbar !== false
    return (
        <View style={[{ rowGap: 8 }, viewStyle]}>
            {(label || description) && (
                <View style={{ rowGap: 4 }}>
                    {label && <TText>{label}</TText>}
                    {description && (
                        <TText color="400" size={12}>
                            {description}
                        </TText>
                    )}
                </View>
            )}
            <View
                style={[
                    {
                        borderWidth: 1,
                        borderColor: color.neutral._400,
                        borderRadius: 8,
                        overflow: 'hidden',
                    },
                    fieldStyle,
                ]}>
                <TextInput
                    ref={attachRef}
                    multiline={isMultiline}
                    numberOfLines={numberOfLines}
                    placeholderTextColor={color.text._500}
                    {...props}
                    style={[
                        {
                            color: color.text._100,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            textAlignVertical: isMultiline ? 'top' : 'center',
                        },
                        style,
                    ]}
                />
                {hasToolbar && (
                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 2,
                            paddingHorizontal: 4,
                        }}>
                        {toolbar}
                    </View>
                )}
            </View>
        </View>
    )
}

export default Object.assign(ThemedTextInput, { Action })
