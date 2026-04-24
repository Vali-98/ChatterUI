import { AntDesign } from '@expo/vector-icons'
import { randomUUID } from 'expo-crypto'
import { useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    BackHandler,
    Dimensions,
    GestureResponderEvent,
    LayoutChangeEvent,
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
const OFFSET = 8

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
        const ne = event.nativeEvent

        setAnchor({
            x: ne.pageX,
            y: ne.pageY,
            width: 0,
            height: 0,
        })

        openMenu(idRef)
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

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

    const [menuSize, setMenuSize] = useState({ width: 0, height: 0 })

    const topSV = useSharedValue(0)
    const leftSV = useSharedValue(0)

    const initial = useRef(true)

    useEffect(() => {
        const safeBounds = {
            top: insets.top + OFFSET,
            bottom: screenHeight - insets.bottom - OFFSET,
            left: insets.left + OFFSET,
            right: screenWidth - insets.right - OFFSET,
        }

        const { width, height } = menuSize
        if (width === 0 || height === 0) return

        const { top, left } = computePosition(anchor, placement, width, height, safeBounds)

        const duration = initial.current ? 0 : 200

        topSV.value = withTiming(top, { duration })
        leftSV.value = withTiming(left, { duration })

        if (initial.current) initial.current = false
    }, [menuSize, anchor, placement, topSV, leftSV, insets, screenHeight, screenWidth])

    const animatedStyle = useAnimatedStyle(() => ({
        top: topSV.value,
        left: leftSV.value,
    }))

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout

        setMenuSize((prev) => {
            if (Math.abs(prev.width - width) < 2 && Math.abs(prev.height - height) < 2) {
                return prev
            }
            return { width, height }
        })
    }, [])

    return (
        <Animated.View style={[styles.menuContainer, animatedStyle]}>
            <View onLayout={handleLayout}>
                <MenuList buttons={buttons} onClose={onClose} placement={placement} />
            </View>
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
            padding: 4,
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
