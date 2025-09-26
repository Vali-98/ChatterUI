// ContextMenu.tsx
import { randomUUID } from 'expo-crypto'
import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { Dimensions, LayoutRectangle, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
    Easing,
    ExitAnimationsValues,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { create } from 'zustand'
import Portal from './Portal'

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'auto'

export type ContextMenuButtonProps = {
    key?: string
    label: string
    onPress?: () => void
    submenu?: ContextMenuButtonProps[]
}

export type ContextMenuProps = {
    trigger: ReactNode
    buttons: ContextMenuButtonProps[]
    placement?: Placement
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

const zoomExitingAnimation = (values: ExitAnimationsValues, anchor: LayoutRectangle) => {
    'worklet'
    const originX = anchor.x + anchor.width / 2
    const originY = anchor.y + anchor.height / 2
    const duration = 200
    const animations = {
        originX: withTiming(originX, { duration }),
        originY: withTiming(originY, { duration }),
        height: withTiming(0, { duration }),
        width: withTiming(0, { duration }),
        opacity: withTiming(0, { duration }),
    }
    const initialValues = {
        originX: values.currentOriginX,
        originY: values.currentOriginY,
        height: values.currentHeight,
        width: values.currentWidth,
        opacity: 1,
    }

    return { initialValues, animations }
}

const defaultAnimatedMenuValues = {
    top: 0,
    left: 0,
    opacity: 0,
    height: null as number | null,
    width: null as number | null,
}

const ContextMenu = ({ trigger, buttons, placement = 'auto' }: ContextMenuProps) => {
    const idRef = useRef<string>(genId())
    const triggerRef = useRef<View>(null)
    const viewRef = useRef<View>(null)
    const { openMenuId, anchor, openMenu, closeMenu } = useContextMenuStore()
    const [expandedSubmenus, setExpandedSubmenus] = useState<string[]>([])
    const runAnimation = useRef(true)
    const animatedMenuValues = useSharedValue(defaultAnimatedMenuValues)
    const getMenuPosition = useMenuPosition()

    useEffect(() => {
        if (isOpen) return
        animatedMenuValues.value = defaultAnimatedMenuValues
        runAnimation.current = true
    }, [openMenuId])

    const animatedMenuStyle = useAnimatedStyle(() => {
        return animatedMenuValues.value
    })

    const handleOpen = () => {
        if (!triggerRef.current) return
        triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
            const anchor: LayoutRectangle = { x: pageX, y: pageY, width, height }
            openMenu(idRef.current, anchor, buttons, placement)
        })
    }

    const handleCloseMenu = () => {
        closeMenu()
        setExpandedSubmenus([])
    }

    const isOpen = openMenuId === idRef.current

    const onLayout = () => {
        if (!runAnimation.current || !anchor) return
        runAnimation.current = false
        if (viewRef.current) {
            viewRef.current.measure((x, y, width, height) => {
                const { left, top } = getMenuPosition(anchor, placement, width, height)
                const duration = 250
                // setup initial placement
                animatedMenuValues.value = {
                    height: 0,
                    width: 0,
                    opacity: 1,
                    top: anchor.y + anchor.height / 2,
                    left: anchor.x + anchor.width / 2,
                }
                // animate to final placement
                animatedMenuValues.value = withTiming(
                    {
                        top,
                        left,
                        height,
                        width,
                        opacity: 1,
                    },
                    { duration },
                    (finished) => {
                        if (finished)
                            animatedMenuValues.value = {
                                top,
                                left,
                                opacity: 1,
                                height: null,
                                width: width,
                            }
                    }
                )
            })
        }
    }

    return (
        <>
            <Pressable ref={triggerRef} onPress={handleOpen}>
                {trigger}
            </Pressable>

            {isOpen && anchor && (
                <Portal name={idRef.current}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseMenu}>
                        <Animated.View
                            style={[styles.menuContainer, animatedMenuStyle]}
                            exiting={(values: ExitAnimationsValues) => {
                                'worklet'
                                return zoomExitingAnimation(values, anchor)
                            }}>
                            <View ref={viewRef} onLayout={onLayout}>
                                <MenuButtons
                                    buttons={buttons}
                                    onClose={handleCloseMenu}
                                    expandedSubmenus={expandedSubmenus}
                                    setExpandedSubmenus={setExpandedSubmenus}
                                />
                            </View>
                        </Animated.View>
                    </Pressable>
                </Portal>
            )}
        </>
    )
}

const MenuButtons = ({
    buttons,
    onClose,
    expandedSubmenus,
    setExpandedSubmenus,
    hidden = false,
    isSubmenu = false,
}: {
    buttons: ContextMenuButtonProps[]
    onClose: () => void
    expandedSubmenus: string[]
    setExpandedSubmenus: (menus: string[]) => void
    hidden?: boolean
    isSubmenu?: boolean
}) => {
    const menuAnimatedValues = useSharedValue(
        hidden
            ? {
                  height: 0,
                  paddingVertical: 0,
              }
            : {
                  height: null,
                  paddingVertical: 4,
              }
    )
    const height = useAnimatedStyle(() => {
        return menuAnimatedValues.value
    })
    const viewRef = useRef<View>(null)

    useEffect(() => {
        if (!hidden && viewRef.current && isSubmenu) {
            viewRef.current.measure((_, __, ___, height) => {
                menuAnimatedValues.value = withTiming(
                    {
                        height: height,
                        paddingVertical: 4,
                    },
                    { duration: 250, easing: Easing.quad },
                    (finished) => {
                        if (finished) {
                            menuAnimatedValues.value = {
                                height: null,
                                paddingVertical: 4,
                            }
                        }
                    }
                )
            })
        } else if (hidden && viewRef.current) {
            viewRef.current.measure((_, __, ___, height) => {
                menuAnimatedValues.value = {
                    height: height,
                    paddingVertical: 4,
                }
                menuAnimatedValues.value = withTiming(
                    {
                        height: 0,
                        paddingVertical: 0,
                    },
                    { duration: 250 }
                )
            })
        }
    }, [hidden])

    return (
        <Animated.View style={[styles.menu, height]}>
            <View ref={viewRef}>
                {buttons.map((btn) => {
                    const key = useRef(randomUUID()).current
                    const hasSubmenu = !!btn.submenu
                    return (
                        <View key={key}>
                            <Pressable
                                style={styles.menuItem}
                                onPress={() => {
                                    if (hasSubmenu) {
                                        if (expandedSubmenus.includes(key))
                                            setExpandedSubmenus(
                                                expandedSubmenus.filter((item) => item !== key)
                                            )
                                        else setExpandedSubmenus([...expandedSubmenus, key])
                                    } else {
                                        btn.onPress?.()
                                        onClose()
                                    }
                                }}>
                                <Text>{btn.label}</Text>
                                {hasSubmenu && (
                                    <Text style={{ marginLeft: 8 }}>
                                        {expandedSubmenus.includes(key) ? '▲' : '▶'}
                                    </Text>
                                )}
                            </Pressable>

                            {hasSubmenu && (
                                <View style={styles.subMenu}>
                                    <MenuButtons
                                        isSubmenu
                                        buttons={btn.submenu!}
                                        onClose={onClose}
                                        expandedSubmenus={expandedSubmenus}
                                        setExpandedSubmenus={setExpandedSubmenus}
                                        hidden={!expandedSubmenus.includes(key) || hidden}
                                    />
                                </View>
                            )}
                        </View>
                    )
                })}
            </View>
        </Animated.View>
    )
}

const useMenuPosition = () => {
    const insets = useSafeAreaInsets()

    const getMenuPosition = (
        anchor: LayoutRectangle,
        placement: Placement,
        menuWidth: number,
        menuHeight: number
    ) => {
        const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
        let top = anchor.y + anchor.height
        let left = anchor.x

        switch (placement) {
            case 'top':
                top = anchor.y - menuHeight
                left = anchor.x + anchor.width / 2 - menuWidth / 2
                break
            case 'bottom':
                top = anchor.y + anchor.height
                left = anchor.x + anchor.width / 2 - menuWidth / 2
                break
            case 'left':
                left = anchor.x + menuWidth
                top = Math.max(anchor.y - menuHeight / 2, insets.top)
                break
            case 'right':
                left = anchor.x - menuWidth
                top = Math.max(anchor.y - menuHeight / 2, insets.top)
                break
            case 'auto':
            default:
                // prevent overflow
                if (anchor.y + menuHeight > screenHeight - insets.bottom)
                    top = anchor.y - menuHeight
                if (anchor.x + menuWidth > screenWidth) left = screenWidth - menuWidth - 8
                break
        }

        return { position: 'absolute' as const, top, left }
    }
    return getMenuPosition
}

const styles = StyleSheet.create({
    menuContainer: {
        position: 'absolute',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        elevation: 5,
        overflow: 'scroll',
    },
    menu: {
        backgroundColor: 'white',
        minWidth: 100,
        borderRadius: 8,
        paddingVertical: 4,
        overflow: 'scroll',
    },
    menuItem: {
        backgroundColor: 'white',
        padding: 12,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subMenu: {
        paddingLeft: 8,
        backgroundColor: '#f6f6f6',
    },
})

export default ContextMenu

/**
 * @TODO:
 * - [x] Nested Animations
 * - [ ] Styling
 */
