import AntDesign, { AntDesignIconName } from '@react-native-vector-icons/ant-design/static'
import { useFocusEffect } from 'expo-router'
import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
    BackHandler,
    GestureResponderEvent,
    LayoutChangeEvent,
    LayoutRectangle,
    Pressable,
    PressableProps,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    useWindowDimensions,
    View,
    ViewProps,
    ViewStyle,
} from 'react-native'
import Animated, {
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
    ExpandHeightIn,
    ExpandHeightUpIn,
    ShrinkHeightOut,
    ShrinkHeightUpOut,
} from '@lib/animations/transitions'
import { AnimatedPressable } from '@lib/components/AnimatedComponents'
import { useContextMenuStore } from '@lib/state/components/ContextMenu'
import { Theme } from '@lib/theme/ThemeManager'

import Portal from './Portal'

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'center'

type RootValue = {
    isOpen: boolean
    disabled: boolean
    anchor: LayoutRectangle | null
    placement: Placement
    open: (event: GestureResponderEvent) => void
    close: () => void
}
type ExpansionValue = { openId: string | null; toggle: (id: string) => void }
type SubmenuValue = { isOpen: boolean; toggle: () => void; disabled: boolean }

const RootContext = createContext<RootValue | null>(null)
const ExpansionContext = createContext<ExpansionValue | null>(null)
const SubmenuContext = createContext<SubmenuValue | null>(null)

function useMenu() {
    const menu = useContext(RootContext)
    // eslint-disable-next-line i18next/no-literal-string
    if (!menu) throw new Error('ContextMenu components must be inside ContextMenu')
    return menu
}

export type ContextMenuProps = {
    children: ReactNode
    placement?: Placement
    disabled?: boolean
}

function Root({ children, placement = 'auto', disabled = false }: ContextMenuProps) {
    const id = useId()
    const isOpen = useContextMenuStore((state) => state.openMenuId === id)
    const [anchor, setAnchor] = useState<LayoutRectangle | null>(null)
    const close = useCallback(() => {
        const state = useContextMenuStore.getState()
        // A delayed handler from this menu must not dismiss a different menu.
        if (state.openMenuId === id) state.closeMenu()
    }, [id])

    useFocusEffect(
        useCallback(() => {
            const handler = BackHandler.addEventListener('hardwareBackPress', () => {
                if (useContextMenuStore.getState().openMenuId !== id) return false
                close()
                return true
            })
            return () => {
                handler.remove()
                close()
            }
        }, [id, close])
    )

    const open = (event: GestureResponderEvent) => {
        if (disabled) return
        setAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, width: 0, height: 0 })
        useContextMenuStore.getState().openMenu(id)
    }

    return (
        <RootContext.Provider value={{ isOpen, disabled, anchor, placement, open, close }}>
            <SubmenuContext.Provider value={null}>{children}</SubmenuContext.Provider>
        </RootContext.Provider>
    )
}

type RowProps = {
    label?: string
    icon?: AntDesignIconName
    iconSize?: number
    labelStyle?: StyleProp<TextStyle>
    iconStyle?: StyleProp<TextStyle>
    variant?: 'normal' | 'warning'
}

export type ContextMenuTriggerProps = Omit<PressableProps, 'children' | 'style'> &
    RowProps & {
        children?: ReactNode
        style?: StyleProp<ViewStyle>
        hidden?: boolean
        longPress?: boolean
    }

function Trigger({
    children,
    label,
    icon,
    iconSize,
    labelStyle,
    iconStyle,
    variant,
    style,
    hidden = false,
    disabled = false,
    longPress = false,
    delayLongPress = 300,
    onPress,
    onLongPress,
    onPressIn,
    onPressOut,
    ...props
}: ContextMenuTriggerProps) {
    const menu = useMenu()
    const submenu = useContext(SubmenuContext)
    const styles = useStyles()
    const isOpen = submenu ? submenu.isOpen : menu.isOpen
    const isDisabled = !!disabled || menu.disabled || !!submenu?.disabled
    const pressed = useSharedValue(false)
    const animatedStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isDisabled || isOpen || pressed.value ? 0.5 : 1, { duration: 120 }),
    }))
    useEffect(() => {
        if (!isOpen) pressed.set(false)
    }, [isOpen, pressed])
    if (hidden) return null

    return (
        <AnimatedPressable
            {...props}
            accessibilityRole="button"
            accessibilityState={{
                ...props.accessibilityState,
                disabled: isDisabled,
                expanded: isOpen,
            }}
            disabled={isDisabled}
            style={[submenu && styles.item, style, animatedStyle]}
            delayLongPress={delayLongPress}
            onPressIn={(event) => {
                pressed.set(true)
                onPressIn?.(event)
                if (!submenu && !longPress) menu.open(event)
            }}
            onPressOut={(event) => {
                pressed.set(false)
                onPressOut?.(event)
            }}
            onPress={(event) => {
                event.stopPropagation()
                if (submenu && !longPress) submenu.toggle()
                onPress?.(event)
            }}
            onLongPress={(event) => {
                onLongPress?.(event)
                if (!longPress) return
                if (submenu) submenu.toggle()
                else menu.open(event)
            }}>
            {children ?? (
                <Row
                    label={label}
                    icon={
                        icon ?? (submenu ? (isOpen ? 'caret-up' : 'caret-down') : 'question-circle')
                    }
                    iconSize={iconSize ?? (submenu ? (icon ? 18 : 12) : 26)}
                    labelStyle={labelStyle}
                    iconStyle={iconStyle}
                    variant={variant}
                />
            )}
        </AnimatedPressable>
    )
}

export type ContextMenuBodyProps = ViewProps & { containerStyle?: StyleProp<ViewStyle> }

function Body({ containerStyle, ...props }: ContextMenuBodyProps) {
    const { t } = useTranslation()
    const menu = useMenu()
    const submenu = useContext(SubmenuContext)
    const id = useId()
    if (submenu) return submenu.isOpen ? <Panel {...props} /> : null
    if (!menu.isOpen || !menu.anchor) return null

    return (
        <Portal name={id}>
            {/* PortalHost renders elsewhere in the tree; explicitly bridge menu context. */}
            <RootContext.Provider value={menu}>
                <SubmenuContext.Provider value={null}>
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={menu.close}
                            accessibilityRole="button"
                            accessibilityLabel={t('common.actions.close')}
                        />
                        <PositionedBody
                            anchor={menu.anchor}
                            placement={menu.placement}
                            style={containerStyle}>
                            <Panel {...props} placement={menu.placement} />
                        </PositionedBody>
                    </View>
                </SubmenuContext.Provider>
            </RootContext.Provider>
        </Portal>
    )
}

function Panel({ children, style, placement, ...props }: ViewProps & { placement?: Placement }) {
    const styles = useStyles()
    const [openId, setOpenId] = useState<string | null>(null)
    return (
        <ExpansionContext.Provider
            value={{
                openId: openId,
                toggle: (id) => setOpenId((current) => (current === id ? null : id)),
            }}>
            <Animated.View
                {...props}
                layout={LinearTransition}
                entering={placement === 'top' ? ExpandHeightUpIn : ExpandHeightIn}
                exiting={placement === 'top' ? ShrinkHeightUpOut : ShrinkHeightOut}
                style={[styles.body, style]}>
                {children}
            </Animated.View>
        </ExpansionContext.Provider>
    )
}

export type ContextMenuSubmenuProps = ViewProps & { hidden?: boolean; disabled?: boolean }
function Submenu({
    children,
    hidden = false,
    disabled = false,
    ...props
}: ContextMenuSubmenuProps) {
    useMenu()
    const expansion = useContext(ExpansionContext)
    const id = useId()
    // eslint-disable-next-line i18next/no-literal-string
    if (!expansion) throw new Error('ContextMenu.Submenu must be inside ContextMenu.Body')
    if (hidden) return null
    return (
        <SubmenuContext.Provider
            value={{
                isOpen: expansion.openId === id,
                toggle: () => expansion.toggle(id),
                disabled: disabled,
            }}>
            <Animated.View {...props} layout={LinearTransition}>
                {children}
            </Animated.View>
        </SubmenuContext.Provider>
    )
}

export type ContextMenuButtonProps = Omit<PressableProps, 'children' | 'onPress'> &
    RowProps & {
        children?: ReactNode
        hidden?: boolean
        closeOnPress?: boolean
        onPress?: (close: () => void) => void | Promise<void>
    }
function Button({
    children,
    label,
    icon,
    iconSize = 18,
    labelStyle,
    iconStyle,
    variant,
    hidden = false,
    disabled = false,
    closeOnPress = true,
    onPress,
    style,
    ...props
}: ContextMenuButtonProps) {
    const menu = useMenu()
    const styles = useStyles()
    if (hidden) return null
    return (
        <Pressable
            {...props}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
            style={(state) => [
                styles.item,
                (disabled || state.pressed) && styles.dimmed,
                typeof style === 'function' ? style(state) : style,
            ]}
            onPress={(event) => {
                event.stopPropagation()
                onPress?.(menu.close)
                // Deliberately immediate: asynchronous handlers choose manual closing when needed.
                if (closeOnPress) menu.close()
            }}>
            {children ?? (
                <Row
                    label={label}
                    icon={icon}
                    iconSize={iconSize}
                    labelStyle={labelStyle}
                    iconStyle={iconStyle}
                    variant={variant}
                />
            )}
        </Pressable>
    )
}

function Row({ label, icon, iconSize, labelStyle, iconStyle, variant }: RowProps) {
    const styles = useStyles()
    const textStyle = variant === 'warning' ? styles.warningText : styles.text
    return (
        <>
            {icon && <AntDesign name={icon} size={iconSize} style={[textStyle, iconStyle]} />}
            {label !== undefined && <Text style={[textStyle, labelStyle]}>{label}</Text>}
        </>
    )
}

function Divider({ style, ...props }: ViewProps) {
    const styles = useStyles()
    return <View {...props} style={[styles.divider, style]} />
}

const OFFSET = 8

function computePosition(
    anchor: LayoutRectangle,
    placement: Placement,
    width: number,
    height: number,
    safe: { top: number; bottom: number; left: number; right: number }
) {
    let top = 0
    let left = 0

    switch (placement) {
        case 'right':
            top = anchor.y + OFFSET
            left = anchor.x + OFFSET
            break

        case 'left':
            top = anchor.y + OFFSET
            left = anchor.x - width - OFFSET
            break

        case 'bottom':
            top = anchor.y + OFFSET
            left = anchor.x - width / 2
            break

        case 'top':
            top = anchor.y - height - OFFSET
            left = anchor.x - width / 2
            break

        case 'center':
            top = anchor.y - height / 2
            left = anchor.x - width / 2
            break

        case 'auto':
        default: {
            const fitsRight = anchor.x + width <= safe.right
            const fitsLeft = anchor.x - width >= safe.left

            if (fitsRight) {
                top = anchor.y + OFFSET
                left = anchor.x + OFFSET
            } else if (fitsLeft) {
                top = anchor.y + OFFSET
                left = anchor.x - width - OFFSET
            } else {
                top = anchor.y - height - OFFSET
                left = anchor.x - width / 2
            }
        }
    }

    const clampedLeft = Math.max(safe.left, Math.min(left, safe.right - width))
    const clampedTop = Math.max(safe.top, Math.min(top, safe.bottom - height))

    return { top: clampedTop, left: clampedLeft }
}

function PositionedBody({
    anchor,
    placement,
    children,
    style,
}: {
    anchor: LayoutRectangle
    placement: Placement
    children: ReactNode
    style?: StyleProp<ViewStyle>
}) {
    const insets = useSafeAreaInsets()
    const { width: screenWidth, height: screenHeight } = useWindowDimensions()
    const [size, setSize] = useState({ width: 0, height: 0 })
    const initial = useRef(true)
    const top = useSharedValue(0)
    const left = useSharedValue(0)
    useEffect(() => {
        if (!size.width || !size.height) return
        const position = computePosition(anchor, placement, size.width, size.height, {
            top: insets.top + OFFSET,
            bottom: screenHeight - insets.bottom - OFFSET,
            left: insets.left + OFFSET,
            right: screenWidth - insets.right - OFFSET,
        })
        const duration = initial.current ? 0 : 200
        top.value = withTiming(position.top, { duration })
        left.value = withTiming(position.left, { duration })
        initial.current = false
    }, [anchor, placement, size, insets, screenWidth, screenHeight, top, left])
    const animatedStyle = useAnimatedStyle(() => ({ top: top.value, left: left.value }))
    const onLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout
        setSize((current) =>
            Math.abs(current.width - width) < 2 && Math.abs(current.height - height) < 2
                ? current
                : { width, height }
        )
    }, [])
    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    maxWidth: screenWidth - insets.left - insets.right - OFFSET * 2,
                },
                style,
                animatedStyle,
            ]}>
            <View onLayout={onLayout}>{children}</View>
        </Animated.View>
    )
}

const useStyles = () => {
    const { color } = Theme.useTheme()
    return StyleSheet.create({
        body: {
            backgroundColor: color.neutral._200,
            minWidth: 128,
            borderColor: color.neutral._400,
            borderWidth: 1,
            padding: 4,
            borderRadius: 8,
            overflow: 'hidden',
        },
        item: {
            padding: 12,
            paddingRight: 24,
            minWidth: 128,
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 12,
        },
        text: { color: color.text._300 },
        warningText: { color: color.error._300 },
        dimmed: { opacity: 0.5 },
        divider: { borderTopWidth: 1, borderColor: color.neutral._300, marginVertical: 8 },
    })
}

const ContextMenu = Object.assign(Root, { Trigger, Body, Button, Submenu, Divider })
export default ContextMenu
