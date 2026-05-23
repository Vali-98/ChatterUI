import React, { ReactNode } from 'react'
import { Modal, View, ViewStyle } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Theme } from '@lib/theme/ThemeManager'

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
    const { height } = useReanimatedKeyboardAnimation()
    const animatedStyle = useAnimatedStyle(() => {
        return {
            paddingBottom: -height.value - insets.bottom,
            flex: 1,
            justifyContent: 'flex-end',
        }
    })
    return (
        <Modal
            transparent
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => {
                setVisible(false)
                onClose?.()
            }}
            style={{
                flex: 1,
            }}
            visible={visible}
            animationType="fade">
            <Animated.View style={[animatedStyle]}>
                <FadeBackrop handleOverlayClick={() => setVisible(false)} />

                <View
                    style={[
                        {
                            paddingTop: spacing.xl2,
                            paddingBottom: insets.bottom + spacing.xl2,
                            paddingLeft: spacing.xl2,
                            paddingRight: spacing.xl,
                            maxHeight: '70%',
                            width: '100%',
                            borderTopLeftRadius: spacing.xl2,
                            borderTopRightRadius: spacing.xl2,
                            backgroundColor: color.neutral._100,
                        },
                        sheetStyle,
                    ]}>
                    {children}
                </View>
            </Animated.View>
        </Modal>
    )
}

export default BottomSheet
