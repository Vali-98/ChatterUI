import {
    createRef,
    forwardRef,
    ReactNode,
    RefObject,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
} from 'react'
import { Modal, View, ViewStyle } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { SlideInDown, SlideOutDown, useAnimatedStyle } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Theme } from '@lib/theme/ThemeManager'

import FadeBackrop from './FadeBackdrop'

export interface BottomSheetRefFunctions {
    open: () => void
    close: () => void
}

export type BottomSheetRef = RefObject<BottomSheetRefFunctions | null>

export interface BottomSheetProps {
    children: ReactNode
    sheetStyle?: ViewStyle
    onClose?: () => void
    onRequestClose?: (close: () => void) => void
}

export const useBottomSheetRef = () => {
    const ref = useRef<BottomSheetRefFunctions>(null)
    return ref
}

export const createBottomSheetRef = () => {
    return createRef<BottomSheetRefFunctions>()
}

const BottomSheet = forwardRef<BottomSheetRefFunctions, BottomSheetProps>(
    ({ children, onClose, sheetStyle, onRequestClose }, ref) => {
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
        const [visible, setVisible] = useState(false)
        const [contentVisible, setContentVisible] = useState(false)

        const handleClose = useCallback(() => {
            setContentVisible(false)
            setVisible(false)
            onClose?.()
        }, [onClose, setVisible, setContentVisible])

        const open = useCallback(() => {
            setVisible(true)
            setContentVisible(true)
        }, [setVisible, setContentVisible])

        useImperativeHandle(
            ref,
            () => ({
                open: open,
                close: handleClose,
            }),
            [handleClose, open]
        )

        return (
            <Modal
                transparent
                statusBarTranslucent
                navigationBarTranslucent
                onRequestClose={() => {
                    if (onRequestClose) {
                        onRequestClose(handleClose)
                        return
                    }
                    handleClose()
                }}
                style={{
                    flex: 1,
                }}
                visible={visible}
                animationType="fade">
                {contentVisible && (
                    <Animated.View
                        style={[animatedStyle]}
                        entering={SlideInDown}
                        exiting={SlideOutDown}>
                        <FadeBackrop handleOverlayClick={handleClose} />
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
                )}
            </Modal>
        )
    }
)

// eslint-disable-next-line i18next/no-literal-string
BottomSheet.displayName = 'BottomSheet'

export default BottomSheet
