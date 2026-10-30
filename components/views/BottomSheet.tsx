import { useTranslation } from 'react-i18next'
import {
    createRef,
    forwardRef,
    type ReactNode,
    type RefObject,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
} from 'react'
import {
    Modal,
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewProps,
    type ViewStyle,
    useWindowDimensions,
} from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import TText from '@components/text/TText'
import { Theme } from '@lib/theme/ThemeManager'

export interface BottomSheetRefFunctions {
    open: () => void
    close: () => void
}
export type BottomSheetRef = RefObject<BottomSheetRefFunctions | null>
export interface BottomSheetProps {
    children: ReactNode
    sheetStyle?: StyleProp<ViewStyle>
    bodyContainerStyle?: StyleProp<ViewStyle>
    onOpen?: () => void
    onClose?: () => void
    onRequestClose?: (close: () => void) => void
}
export const useBottomSheetRef = () => useRef<BottomSheetRefFunctions>(null)
export const createBottomSheetRef = () => createRef<BottomSheetRefFunctions>()

export const BottomSheetHeader = ({
    title,
    description,
    children,
    style,
    ...props
}: ViewProps & { title?: string; description?: string }) => (
    <View {...props} style={[{ rowGap: 8 }, style]}>
        {title ? <TText size={18}>{title}</TText> : null}
        {description ? <TText color="400">{description}</TText> : null}
        {children}
    </View>
)
const BottomSheet = forwardRef<BottomSheetRefFunctions, BottomSheetProps>(
    ({ children, onOpen, onClose, sheetStyle, bodyContainerStyle, onRequestClose }, ref) => {
        const { t } = useTranslation()
        const { color, borderRadius } = Theme.useTheme()
        const insets = useSafeAreaInsets()
        const { height: keyboardHeight } = useReanimatedKeyboardAnimation()
        const window = useWindowDimensions()
        const progress = useSharedValue(0)
        const sheetHeight = useSharedValue(window.height)
        const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed')
        const phaseRef = useRef(phase)
        const transition = useCallback((next: typeof phase) => {
            phaseRef.current = next
            setPhase(next)
        }, [])

        const finishClose = useCallback(() => {
            if (phaseRef.current !== 'closing') return
            transition('closed')
            onClose?.()
        }, [onClose, transition])
        const close = useCallback(() => {
            if (phaseRef.current !== 'open') return
            transition('closing')
            progress.set(
                withTiming(0, { duration: 200 }, (finished) => {
                    if (finished) scheduleOnRN(finishClose)
                })
            )
        }, [finishClose, progress, transition])
        const open = useCallback(() => {
            if (phaseRef.current === 'open') return
            if (phaseRef.current === 'closing') {
                transition('open')
                progress.set(withTiming(1, { duration: 200 }))
                return
            }
            transition('open')
            progress.set(0)
            onOpen?.()
        }, [onOpen, progress, transition])
        const requestClose = () => {
            if (phaseRef.current !== 'open') return
            if (onRequestClose) onRequestClose(close)
            else close()
        }
        useImperativeHandle(ref, () => ({ open, close }), [open, close])
        const position = useAnimatedStyle(() => ({
            paddingBottom: Math.max(0, -keyboardHeight.value),
        }))
        const backdrop = useAnimatedStyle(() => ({ opacity: progress.value * 0.5 }))
        const surface = useAnimatedStyle(() => ({
            transform: [{ translateY: (1 - progress.value) * sheetHeight.value }],
            paddingBottom: Math.max(0, insets.bottom + keyboardHeight.value),
        }))
        return (
            <Modal
                transparent
                statusBarTranslucent
                navigationBarTranslucent
                visible={phase !== 'closed'}
                animationType="none"
                onRequestClose={requestClose}
                onShow={() => {
                    if (phaseRef.current === 'open') progress.set(withTiming(1, { duration: 200 }))
                }}>
                <View style={{ flex: 1 }}>
                    <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, backdrop]}
                    />
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('common.actions.close')}
                        style={StyleSheet.absoluteFill}
                        onPress={requestClose}
                    />
                    <Animated.View
                        pointerEvents="box-none"
                        style={[{ flex: 1, justifyContent: 'flex-end' }, position]}>
                        <Animated.View
                            pointerEvents={phase === 'closing' ? 'none' : 'auto'}
                            onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
                            style={[
                                {
                                    maxHeight: '70%',
                                    width: '100%',
                                    flexShrink: 1,
                                    borderTopLeftRadius: borderRadius.xl2,
                                    borderTopRightRadius: borderRadius.xl2,
                                    backgroundColor: color.neutral._100,
                                },
                                sheetStyle,
                                surface,
                            ]}>
                            <View style={[{ flexShrink: 1 }, bodyContainerStyle]}>{children}</View>
                        </Animated.View>
                    </Animated.View>
                </View>
            </Modal>
        )
    }
)
BottomSheet.displayName = 'BottomSheet'
export default BottomSheet
