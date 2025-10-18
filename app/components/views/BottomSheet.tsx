import { Theme } from '@lib/theme/ThemeManager'
import React, { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, View, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FadeBackrop from './FadeBackdrop'

export interface BottomSheetProps {
    visible: boolean
    setVisible: (visible: boolean) => void
    children: ReactNode
    sheetStyle?: ViewStyle
    onClose?: () => void
}

const BottomSheet: React.FC<BottomSheetProps> = ({
    visible,
    setVisible,
    children,
    onClose,
    sheetStyle,
}) => {
    const { color, spacing } = Theme.useTheme()
    const insets = useSafeAreaInsets()
    return (
        <Modal
            transparent
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => {
                setVisible(false)
                onClose?.()
            }}
            visible={visible}
            animationType="fade">
            <KeyboardAvoidingView
                behavior="height"
                keyboardVerticalOffset={-insets.bottom}
                style={{ flex: 1 }}>
                <FadeBackrop handleOverlayClick={() => setVisible(false)} />
                <View style={{ flex: 1 }} />
                <View
                    style={[
                        {
                            paddingTop: spacing.xl2,
                            paddingBottom: insets.bottom + spacing.xl2,
                            paddingHorizontal: spacing.xl3,
                            flexShrink: 1,
                            maxHeight: '70%',
                            borderTopLeftRadius: spacing.xl2,
                            borderTopRightRadius: spacing.xl2,
                            backgroundColor: color.neutral._100,
                        },
                        sheetStyle,
                    ]}>
                    {children}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

export default BottomSheet
