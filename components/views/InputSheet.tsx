import { getStringAsync } from 'expo-clipboard'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import type { ThemedButtonProps } from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import TText from '@components/text/TText'
import BottomSheetControls, { BottomSheetButton } from '@components/views/BottomSheetControls'
import { Theme } from '@lib/theme/ThemeManager'

import BottomSheet, { BottomSheetHeader, type BottomSheetRef } from './BottomSheet'

export type InputSheetProps = {
    ref: BottomSheetRef
    onConfirm: (text: string) => unknown
    onClose?: () => void
    title?: string
    description?: string
    placeholder?: string
    verifyText?: (text: string) => string
    errorMessage?: string
    autoFocus?: boolean
    defaultValue?: string
    multiline?: boolean
    confirmLabel?: string
    cancelLabel?: string
    confirmButtonProps?: Omit<ThemedButtonProps, 'label' | 'onPress'>
    cancelButtonProps?: Omit<ThemedButtonProps, 'label' | 'onPress'>
    rememberInput?: boolean
    inputKey?: string | number
    bodyContainerStyle?: StyleProp<ViewStyle>
}
export type InputSheetRef = BottomSheetRef
const InputSheet = ({
    ref,
    onConfirm,
    onClose,
    title,
    description,
    placeholder,
    verifyText,
    errorMessage,
    autoFocus = false,
    defaultValue = '',
    multiline = false,
    confirmLabel,
    cancelLabel,
    confirmButtonProps,
    cancelButtonProps,
    rememberInput = false,
    inputKey,
    bodyContainerStyle,
}: InputSheetProps) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const [text, setText] = useState(defaultValue)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const identity = useRef<string | number | undefined>(undefined)
    const saved = useRef(false)
    const committing = useRef(false)
    const submit = async () => {
        if (committing.current) return
        const validation = verifyText?.(text)
        if (validation) {
            setError(validation)
            return
        }
        committing.current = true
        setSaving(true)
        setError('')
        try {
            await onConfirm(text)
            saved.current = true
            ref.current?.close()
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
            committing.current = false
            setSaving(false)
        }
    }
    return (
        <BottomSheet
            ref={ref}
            bodyContainerStyle={[
                { paddingHorizontal: 16, paddingVertical: 16, rowGap: 16 },
                bodyContainerStyle,
            ]}
            onOpen={() => {
                const key = inputKey ?? defaultValue
                if (!rememberInput || identity.current !== key || saved.current)
                    setText(defaultValue)
                identity.current = key
                saved.current = false
                setError('')
            }}
            onClose={() => {
                setError('')
                onClose?.()
            }}
            onRequestClose={saving ? () => {} : undefined}>
            {(title || description) && (
                <BottomSheetHeader
                    title={title}
                    description={description}
                    style={{ paddingVertical: 8 }}
                />
            )}
            <View style={{ rowGap: 8 }}>
                <ThemedTextInput
                    multiline={multiline}
                    autoFocus={autoFocus}
                    placeholder={placeholder}
                    value={text}
                    onChangeText={setText}
                    editable={!saving}
                    numberOfLines={multiline ? 10 : 1}
                    toolbar={
                        <>
                            <ThemedTextInput.Action
                                label={t('common.actions.clear')}
                                iconName="close"
                                disabled={saving}
                                onPress={() => setText('')}
                            />
                            <ThemedTextInput.Action
                                label={t('common.actions.paste')}
                                iconName={{ family: 'material', name: 'content-paste' }}
                                disabled={saving}
                                onPress={async () => {
                                    const paste = await getStringAsync()
                                    if (paste) setText((value) => value + paste)
                                }}
                            />
                        </>
                    }
                />
                {!!(error || errorMessage) && (
                    <TText style={{ color: color.error._400 }}>{error || errorMessage}</TText>
                )}
            </View>
            <BottomSheetControls>
                <BottomSheetButton
                    variant="secondary"
                    {...cancelButtonProps}
                    label={cancelLabel ?? t('common.actions.close')}
                    disabled={saving || cancelButtonProps?.disabled}
                    onPress={() => ref.current?.close()}
                />
                <BottomSheetButton
                    variant="secondary"
                    {...confirmButtonProps}
                    label={confirmLabel ?? t('common.actions.save')}
                    disabled={saving || confirmButtonProps?.disabled}
                    onPress={() => {
                        void submit()
                    }}
                />
            </BottomSheetControls>
        </BottomSheet>
    )
}
export default InputSheet
