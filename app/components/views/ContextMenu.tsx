import { AntDesign } from '@expo/vector-icons'
import { randomUUID } from 'expo-crypto'
import { useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    BackHandler,
    Dimensions,
    GestureResponderEvent,
    LayoutRectangle,
    Pressable,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewProps,
} from 'react-native'
import Animated, {
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import {
    ExpandHeightIn,
    ExpandHeightUpIn,
    ShrinkHeightOut,
    ShrinkHeightUpOut,
} from '@lib/animations/transitions'
import { useContextMenuStore } from '@lib/state/components/ContextMenu'
import { Theme } from '@lib/theme/ThemeManager'

import Portal from './Portal'

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'center'

export type ContextMenuButtonProps = {
    key?: string
    label: string
    onPress?: (close: () => void) => void
    submenu?: ContextMenuButtonProps[]
    icon?: keyof typeof AntDesign.glyphMap
    iconSize?: number
    textColor?: string
    variant?: 'normal' | 'warning'
    disabled?: boolean
}

export interface ContextMenuProps extends ViewProps {
    triggerIcon?: keyof typeof AntDesign.glyphMap
    triggerIconSize?: number
    triggerStyle?: TextStyle
    buttons: ContextMenuButtonProps[]
    placement?: Placement
    disabled?: boolean
    onPress?: () => void
    onLongPress?: () => void
    delayLongPress?: number
    longPress?: boolean
}

const CONTEXT_MENU_MIN_WIDTH = 128
const OFFSET = 4

const ContextMenu: React.FC<ContextMenuProps> = ({
    buttons,
    children,
    placement = 'auto',
    triggerIcon = 'question-circle',
    triggerIconSize = 26,
    triggerStyle,
    disabled,
    onPress,
    onLongPress,
    delayLongPress,
    longPress,
}) => {
    const [idRef] = useState(() => `context-menu-${randomUUID()}`)
    const triggerRef = useRef<View>(null)
    const styles = useStyles()

    const { isOpen, openMenu, closeMenu } = useContextMenuStore(
        useShallow((state) => ({
            isOpen: state.openMenuId === idRef,
            openMenu: state.openMenu,
            closeMenu: state.closeMenu,
        }))
    )

    const [anchor, setAnchor] = useState<LayoutRectangle | null>(null)

    const handleOpen = (event: GestureResponderEvent) => {
        if (!triggerRef.current) return

        const isCentered = placement === 'center'
        const ne = event.nativeEvent

        triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
            setAnchor({
                x: isCentered ? ne.pageX : pageX,
                y: isCentered ? ne.pageY : pageY,
                width: width,
                height: height,
            })
            openMenu(idRef)
        })
    }

    const handleCloseMenu = useCallback(() => {
        closeMenu()
    }, [closeMenu])

    useFocusEffect(
        useCallback(() => {
            const backAction = () => {
                if (isOpen) {
                    handleCloseMenu()
                    return true
                }
                return false
            }
            const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
            return () => handler.remove()
        }, [handleCloseMenu, isOpen])
    )

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.5}
                style={{ opacity: isOpen ? 0.5 : 1 }}
                ref={triggerRef}
                onPressIn={(event) => {
                    if (longPress) return
                    handleOpen(event)
                }}
                onPress={() => onPress?.()}
                delayLongPress={delayLongPress ?? 300}
                onLongPress={(event) => {
                    onLongPress?.()
                    if (!longPress) return
                    handleOpen(event)
                }}
                disabled={disabled}>
                {children || (
                    <AntDesign
                        size={triggerIconSize}
                        style={[styles.menuText, triggerStyle]}
                        name={triggerIcon}
                    />
                )}
            </TouchableOpacity>

            {isOpen && anchor && (
                <Portal name={idRef}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseMenu}>
                        <MenuContent
                            anchor={anchor}
                            placement={placement}
                            buttons={buttons}
                            onClose={handleCloseMenu}
                        />
                    </Pressable>
                </Portal>
            )}
        </>
    )
}

const MenuContent = ({
    anchor,
    placement,
    buttons,
    onClose,
}: {
    anchor: LayoutRectangle
    placement: Placement
    buttons: ContextMenuButtonProps[]
    onClose: () => void
}) => {
    const styles = useStyles()
    const insets = useSafeAreaInsets()

    const { width: screenWidth, height: screenHeightRaw } = Dimensions.get('window')
    const screenHeight = screenHeightRaw - insets.top

    // approximate size (no measurement loop)
    const estimatedWidth = 180
    const estimatedHeight = buttons.length * 48

    let top = anchor.y + anchor.height
    let left = anchor.x

    if (placement === 'top') {
        top = anchor.y - estimatedHeight
        left = anchor.x + anchor.width / 2 - estimatedWidth / 2
    }

    if (placement === 'bottom') {
        top = anchor.y + anchor.height
        left = anchor.x + anchor.width / 2 - estimatedWidth / 2
    }
    if (placement === 'left') left = anchor.x - estimatedWidth
    if (placement === 'right') left = anchor.x + anchor.width
    if (placement === 'center') {
        top = anchor.y
        left = anchor.x
    }

    // clamp
    left = Math.max(OFFSET, Math.min(left, screenWidth - estimatedWidth - OFFSET))
    top = Math.max(insets.top, Math.min(top, screenHeight - estimatedHeight - OFFSET))

    // animation
    const scale = useSharedValue(0.95)
    const opacity = useSharedValue(0)

    useEffect(() => {
        scale.value = withSpring(1)
        opacity.value = withTiming(1, { duration: 150 })
    }, [opacity, scale])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
        top: top,
        left: left,
    }))

    return (
        <Animated.View style={[styles.menuContainer, animatedStyle]}>
            <MenuList buttons={buttons} onClose={onClose} placement={placement} />
        </Animated.View>
    )
}

const MenuList = ({
    buttons,
    onClose,
    placement,
}: {
    buttons: ContextMenuButtonProps[]
    onClose: () => void
    placement?: Placement
}) => {
    const styles = useStyles()
    const [openKey, setOpenKey] = useState<string | null>(null)

    return (
        <Animated.View
            layout={LinearTransition}
            entering={placement === 'top' ? ExpandHeightUpIn : ExpandHeightIn}
            exiting={placement === 'top' ? ShrinkHeightUpOut : ShrinkHeightOut}
            style={styles.menu}>
            {buttons
                .filter((b) => !b.disabled)
                .map((item, index) => {
                    const key = item.key ?? `${index}`
                    const hasSubmenu = !!item.submenu

                    return (
                        <Animated.View key={key} layout={LinearTransition}>
                            <Pressable
                                style={styles.menuItem}
                                onPress={() => {
                                    if (hasSubmenu) {
                                        setOpenKey(openKey === key ? null : key)
                                    } else {
                                        item.onPress?.(onClose)
                                    }
                                }}>
                                {item.icon && (
                                    <AntDesign
                                        name={item.icon}
                                        size={item.iconSize ?? 18}
                                        style={
                                            item.variant === 'warning'
                                                ? styles.menuTextError
                                                : styles.menuText
                                        }
                                    />
                                )}

                                {!item.icon && hasSubmenu && (
                                    <AntDesign
                                        name={openKey === key ? 'caret-up' : 'caret-down'}
                                        size={12}
                                        style={styles.menuText}
                                    />
                                )}

                                <Text
                                    style={
                                        item.variant === 'warning'
                                            ? styles.menuTextError
                                            : styles.menuText
                                    }>
                                    {item.label}
                                </Text>
                            </Pressable>

                            {hasSubmenu && openKey === key && (
                                <MenuList buttons={item.submenu!} onClose={onClose} />
                            )}
                        </Animated.View>
                    )
                })}
        </Animated.View>
    )
}

const useStyles = () => {
    const { color } = Theme.useTheme()
    return StyleSheet.create({
        menuContainer: {
            position: 'absolute',
            borderRadius: 8,
        },
        menu: {
            backgroundColor: color.neutral._200,
            minWidth: CONTEXT_MENU_MIN_WIDTH,
            borderColor: color.neutral._400,
            borderWidth: 1,
            paddingHorizontal: 4,
            borderRadius: 8,
            overflow: 'hidden',
        },
        menuItem: {
            padding: 12,
            paddingRight: 24,
            minWidth: CONTEXT_MENU_MIN_WIDTH,
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 12,
        },
        menuText: {
            color: color.text._300,
        },
        menuTextError: {
            color: color.error._300,
        },
    })
}

export default ContextMenu
