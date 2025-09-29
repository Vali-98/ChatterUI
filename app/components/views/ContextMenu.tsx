import { AntDesign } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { randomUUID } from 'expo-crypto'
import { useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    BackHandler,
    Dimensions,
    LayoutRectangle,
    Pressable,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewProps,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'
import { create } from 'zustand'
import Portal from './Portal'

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'auto'

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
}

export type MenuState = {
    openMenuId: string | null
    anchor: LayoutRectangle | null
    placement: Placement
    buttons: ContextMenuButtonProps[]
    openMenu: (
        id: string,
        anchor: LayoutRectangle,
        buttons: ContextMenuButtonProps[],
        placement: Placement
    ) => void
    closeMenu: () => void
}

type ContextMenuWindowProps = {
    buttons: ContextMenuButtonProps[]
    handleCloseMenu: () => void
    expandedSubmenus: string[]
    handleExpandMenus: (key: string, hasSubmenu: boolean, item: ContextMenuButtonProps) => void
    hidden?: boolean
    isSubmenu?: boolean
    reposition: () => void
}

const genId = () => `context-menu-${randomUUID()}`

const useContextMenuStore = create<MenuState>((set) => ({
    openMenuId: null,
    anchor: null,
    placement: 'auto',
    buttons: [],
    openMenu: (id, anchor, buttons, placement) =>
        set({ openMenuId: id, anchor, buttons, placement }),
    closeMenu: () => set({ openMenuId: null, anchor: null, buttons: [], placement: 'auto' }),
}))

const defaultAnimatedMenuValues = {
    top: 0,
    left: 0,
    opacity: 0,
    height: null as number | null,
    width: null as number | null,
}

const CONTEXT_MENU_LAYOUT_DURATION = 250

const ContextMenu: React.FC<ContextMenuProps> = ({
    buttons,
    children,
    placement = 'auto',
    triggerIcon = 'questioncircle',
    triggerIconSize = 26,
    triggerStyle,
    disabled,
}) => {
    const idRef = useRef<string>(genId())
    const triggerRef = useRef<View>(null)
    const viewRef = useRef<View>(null)
    const styles = useStyles()
    const { openMenuId, anchor, openMenu, closeMenu } = useContextMenuStore()
    const [expandedSubmenus, setExpandedSubmenus] = useState<string[]>([])
    const runAnimation = useRef(true)
    const initialRender = useRef(true)
    const wasOvershot = useRef(true)
    const animatedMenuValues = useSharedValue(defaultAnimatedMenuValues)
    const getMenuPosition = useMenuPosition()

    const isOpen = openMenuId === idRef.current
    const animatedMenuStyle = useAnimatedStyle(() => {
        return animatedMenuValues.value
    })

    useEffect(() => {
        if (isOpen) return
        animatedMenuValues.value = defaultAnimatedMenuValues
        runAnimation.current = true
        initialRender.current = true
    }, [openMenuId])

    const handleOpen = () => {
        if (!triggerRef.current) return
        triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
            const anchor: LayoutRectangle = { x: pageX, y: pageY, width, height }
            openMenu(idRef.current, anchor, buttons, placement)
        })
    }

    const handleCloseMenu = () => {
        setExpandedSubmenus([])
        closeMenu()
    }

    const reposition = () => {
        runAnimation.current = true
        onLayout()
    }

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
        }, [isOpen])
    )

    const onLayout = () => {
        if (!runAnimation.current || !anchor || !viewRef.current) return
        runAnimation.current = false

        viewRef.current.measure((_, __, measuredWidth, measuredHeight) => {
            const { overshot, left, top, width, height } = getMenuPosition(
                anchor,
                placement,
                measuredWidth,
                measuredHeight,
                animatedMenuValues.value.top,
                animatedMenuValues.value.left,
                wasOvershot.current
            )

            if (initialRender.current) {
                setInitialPlacement(anchor)
                initialRender.current = false
            } else if (overshot || wasOvershot.current) {
                wasOvershot.current = overshot
                updateOvershotPlacement(width, height)
            } else {
                return
            }

            animateToFinalPlacement({ top, left, width, height })
        })
    }

    const setInitialPlacement = (anchor: LayoutRectangle) => {
        animatedMenuValues.value = {
            height: 0,
            width: 0,
            opacity: 0,
            top: anchor.y + anchor.height / 2,
            left: anchor.x + anchor.width / 2,
        }
    }

    const updateOvershotPlacement = (width: number, height: number) => {
        animatedMenuValues.value = {
            ...animatedMenuValues.value,
            width,
            height,
            opacity: 1,
        }
    }

    const handleExpandMenus = (key: string, hasSubmenu: boolean, item: ContextMenuButtonProps) => {
        if (hasSubmenu) {
            if (expandedSubmenus.includes(key))
                setExpandedSubmenus(expandedSubmenus.filter((item) => item !== key))
            else setExpandedSubmenus([...expandedSubmenus, key])
        } else {
            item.onPress?.(handleCloseMenu)
        }
    }

    const animateToFinalPlacement = ({
        top,
        left,
        width,
        height,
    }: {
        top: number
        left: number
        width: number
        height: number
    }) => {
        animatedMenuValues.value = withTiming(
            { top, left, height, width, opacity: 1 },
            { duration: CONTEXT_MENU_LAYOUT_DURATION },
            (finished) => {
                if (finished) {
                    animatedMenuValues.value = {
                        top,
                        left,
                        opacity: 1,
                        height: null,
                        width: null,
                    }
                }
            }
        )
    }

    return (
        <>
            <Pressable
                //@TODO: Better 'isOpen' styling for anchor
                style={{ opacity: isOpen ? 0.5 : 1 }}
                ref={triggerRef}
                onPressIn={handleOpen}
                key={idRef.current}
                disabled={disabled}>
                {children}
                {!children && (
                    <AntDesign
                        size={triggerIconSize}
                        style={[styles.menuText, triggerStyle]}
                        name={triggerIcon}
                    />
                )}
            </Pressable>

            {isOpen && anchor && (
                <Portal name={idRef.current}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseMenu}>
                        <Animated.View style={[styles.menuContainer, animatedMenuStyle]}>
                            <View ref={viewRef} onLayout={onLayout}>
                                <ContextMenuWindow
                                    reposition={reposition}
                                    buttons={buttons}
                                    handleCloseMenu={handleCloseMenu}
                                    expandedSubmenus={expandedSubmenus}
                                    handleExpandMenus={handleExpandMenus}
                                />
                            </View>
                        </Animated.View>
                    </Pressable>
                </Portal>
            )}
        </>
    )
}

const ContextMenuWindow: React.FC<ContextMenuWindowProps> = ({
    buttons,
    handleCloseMenu,
    expandedSubmenus,
    handleExpandMenus,
    hidden = false,
    isSubmenu = false,
    reposition,
}) => {
    const styles = useStyles()
    const viewRef = useRef<View>(null)

    const menuAnimatedValues = useSharedValue(
        hidden ? { height: 0, paddingVertical: 0 } : { height: null, paddingVertical: 4 }
    )
    const height = useAnimatedStyle(() => {
        return menuAnimatedValues.value
    })

    useEffect(() => {
        if (!viewRef.current) return
        viewRef.current.measure((_, __, ___, height) => {
            if (!hidden && isSubmenu)
                menuAnimatedValues.value = withTiming(
                    { height: height + 8 * buttons.length, paddingVertical: 4 },
                    { duration: 250 },
                    (finished) => {
                        if (finished) {
                            menuAnimatedValues.value = { height: null, paddingVertical: 4 }
                            scheduleOnRN(reposition)
                        }
                    }
                )
            else if (hidden) {
                menuAnimatedValues.value = { height: height, paddingVertical: 4 }
                menuAnimatedValues.value = withTiming(
                    { height: 0, paddingVertical: 0 },
                    { duration: 250 },
                    (finished) => finished && scheduleOnRN(reposition)
                )
            }
        })
    }, [hidden])

    return (
        <Animated.View style={[styles.menu, height]}>
            <View ref={viewRef} style={{ rowGap: 4 }}>
                {buttons
                    .filter((item) => !item.disabled)
                    .map((item) => {
                        return (
                            <ContextMenuButton
                                {...item}
                                reposition={reposition}
                                handleCloseMenu={handleCloseMenu}
                                expandedSubmenus={expandedSubmenus}
                                handleExpandMenus={handleExpandMenus}
                            />
                        )
                    })}
            </View>
        </Animated.View>
    )
}

const ContextMenuButton: React.FC<
    ContextMenuButtonProps & Omit<ContextMenuWindowProps, 'buttons'>
> = (props) => {
    const {
        handleExpandMenus,
        handleCloseMenu,
        expandedSubmenus,
        reposition,
        label,
        submenu,
        icon,
        iconSize,
        textColor,
        variant,
        hidden,
    } = props
    const styles = useStyles()
    const key = useRef(randomUUID()).current
    const hasSubmenu = !!submenu
    const textColors = {
        warning: styles.menuTextError,
        normal: styles.menuText,
    }
    const textStyle = textColor ? { color: textColor } : textColors[variant ?? 'normal']
    return (
        <View key={key}>
            <Pressable
                style={styles.menuItem}
                onPress={() => handleExpandMenus(key, hasSubmenu, props)}>
                {icon && <AntDesign name={icon} style={textStyle} size={iconSize ?? 18} />}
                {!icon && hasSubmenu && (
                    <AntDesign
                        style={textStyle}
                        size={iconSize ?? 12}
                        name={expandedSubmenus.includes(key) ? 'caretup' : 'caretdown'}
                    />
                )}
                <Text style={textStyle}>{label}</Text>
            </Pressable>

            {hasSubmenu && (
                <View style={styles.subMenu}>
                    <ContextMenuWindow
                        reposition={reposition}
                        isSubmenu
                        buttons={submenu!}
                        handleCloseMenu={handleCloseMenu}
                        expandedSubmenus={expandedSubmenus}
                        handleExpandMenus={handleExpandMenus}
                        hidden={!expandedSubmenus.includes(key) || hidden}
                    />
                </View>
            )}
        </View>
    )
}

const CONTEXT_MENU_POSITION_OFFSET = 4
const CONTEXT_MENU_MIN_WIDTH = 128

const useMenuPosition = () => {
    const insets = useSafeAreaInsets()

    const getMenuPosition = (
        anchor: LayoutRectangle,
        placement: Placement,
        menuWidth: number,
        menuHeight: number,
        currentTop: number,
        currentLeft: number,
        wasOvershot: boolean
    ) => {
        const { width: screenWidth, height: sHeight } = Dimensions.get('window')
        const screenHeight = sHeight - insets.top
        let top = anchor.y + anchor.height
        let left = anchor.x
        const actualWidth = Math.max(
            CONTEXT_MENU_MIN_WIDTH + CONTEXT_MENU_POSITION_OFFSET,
            menuWidth + CONTEXT_MENU_POSITION_OFFSET
        )
        const actualHeight = menuHeight + CONTEXT_MENU_POSITION_OFFSET
        switch (placement) {
            case 'top':
                top = anchor.y - actualHeight
                left = anchor.x + anchor.width / 2 - actualWidth / 2
                break
            case 'bottom':
                top = anchor.y + anchor.height
                left = anchor.x + anchor.width / 2 - actualWidth / 2
                break
            case 'right':
                left = anchor.x + anchor.width
                top = currentTop !== 0 && !wasOvershot ? currentTop : anchor.y - actualHeight / 2
                break
            case 'left':
                left = anchor.x - actualWidth
                top = currentTop !== 0 && !wasOvershot ? currentTop : anchor.y - actualHeight / 2
                break
            case 'auto':
            default:
                break
        }
        let overshot = false
        // overflow prevention
        if (left < 0) {
            left = 0 + CONTEXT_MENU_POSITION_OFFSET
            overshot = true
        } else if (left + actualWidth > screenWidth) {
            left = screenWidth - actualWidth - CONTEXT_MENU_POSITION_OFFSET
            overshot = true
        }

        // Clamp values to keep menu on screen
        if (top < insets.top) {
            console.log(`top overshot`)
            top = insets.top
            overshot = true
        } else if (top + actualHeight > screenHeight) {
            top = screenHeight - actualHeight - CONTEXT_MENU_POSITION_OFFSET
            overshot = true
        }

        return {
            top,
            left,
            overshot,
            width: actualWidth - CONTEXT_MENU_POSITION_OFFSET,
            height: actualHeight - CONTEXT_MENU_POSITION_OFFSET,
        }
    }
    return getMenuPosition
}

const useStyles = () => {
    const { color } = Theme.useTheme()
    return StyleSheet.create({
        menuContainer: {
            position: 'absolute',
            borderRadius: 8,
            backgroundColor: color.neutral._200,
            elevation: 5,
            overflow: 'scroll',
        },
        menu: {
            backgroundColor: color.neutral._200,
            minWidth: CONTEXT_MENU_MIN_WIDTH,
            borderColor: color.neutral._400,
            borderWidth: 1,
            paddingHorizontal: 4,
            borderRadius: 8,
            overflow: 'scroll',
        },
        menuItem: {
            padding: 12,
            paddingRight: 24,
            minWidth: CONTEXT_MENU_MIN_WIDTH,
            flex: 1,
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
        subMenu: {
            backgroundColor: color.neutral._200,
            borderRadius: 8,
        },
    })
}

export default ContextMenu
