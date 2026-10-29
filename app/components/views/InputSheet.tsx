import { getStringAsync } from 'expo-clipboard'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import TText from '@components/text/TText'
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
                <BottomSheetHeader title={title} description={description} />
            )}
            <View style={{ rowGap: 8 }}>
                <ThemedTextInput
                    multiline={multiline}
                    autoFocus={autoFocus}
                    placeholder={placeholder}
                    value={text}
                    onChangeText={setText}
                    editable={!saving}
                    containerStyle={{ flex: 0 }}
                    numberOfLines={multiline ? 10 : 1}
                />
                {!!(error || errorMessage) && (
                    <TText style={{ color: color.error._400 }}>{error || errorMessage}</TText>
                )}
            </View>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                <ThemedButton
                    label={t('common.actions.close')}
                    variant="secondary"
                    disabled={saving}
                    onPress={() => ref.current?.close()}
                />
                <View style={{ flexDirection: 'row', columnGap: 12 }}>
                    <IconButton
                        iconStyle={{ color: color.text._400 }}
                        iconName="close"
                        variant="tertiary"
                        disabled={saving}
                        onPress={() => setText('')}
                    />
                    <IconButton
                        iconStyle={{ color: color.text._400 }}
                        iconName="copy"
                        variant="tertiary"
                        disabled={saving}
                        onPress={async () => {
                            const paste = await getStringAsync()
                            if (paste) setText((value) => value + paste)
                        }}
                    />
                </View>
                <ThemedButton
                    label={confirmLabel ?? t('common.actions.save')}
                    variant="secondary"
                    disabled={saving}
                    onPress={() => {
                        void submit()
                    }}
                />
            </View>
        </BottomSheet>
    )
}
export default InputSheet
