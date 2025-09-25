// ContextMenu.tsx
import { randomUUID } from 'expo-crypto'
import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { Dimensions, LayoutRectangle, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
    ExitAnimationsValues,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'
import { create } from 'zustand'
import Portal from './Portal'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

//////////////////////
// Namespace & Types
//////////////////////

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

//////////////////////
// Zustand Store
//////////////////////

let menuIdCounter = 0
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

//////////////////////
// ContextMenu Component
//////////////////////

const ContextMenu = ({ trigger, buttons, placement = 'auto' }: ContextMenuProps) => {
    const idRef = useRef<string>(genId())
    const triggerRef = useRef<View>(null)
    const viewRef = useRef<View>(null)
    const { openMenuId, anchor, openMenu, closeMenu } = useContextMenuStore()
    const [expandedSubmenus, setExpandedSubmenus] = useState<string | null>(null)
    const menuTop = useSharedValue(0)
    const menuLeft = useSharedValue(0)
    const menuOpacity = useSharedValue(0)
    const menuHeight = useSharedValue<null | number>(null)
    const menuWidth = useSharedValue<null | number>(null)
    const runAnimation = useRef(true)
    const initial = useRef(true)
    const getMenuPosition = useMenuPosition()

    useEffect(() => {
        if (!isOpen) {
            initial.current = true
            menuTop.value = 0
            menuLeft.value = 0
            menuOpacity.value = 0
            menuHeight.value = null
            menuWidth.value = null
        }
        runAnimation.current = true
    }, [
        openMenuId, // reset initial render logic
        expandedSubmenus, // need to animate for expansion
    ])

    const animatedMenuStyle = useAnimatedStyle(() => {
        return {
            position: 'absolute',
            top: menuTop.value,
            left: menuLeft.value,
            opacity: menuOpacity.value,
            height: menuHeight.value,
            width: menuWidth.value,
            overflow: 'scroll',
        }
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
        setExpandedSubmenus(null)
    }

    const exitingAnimation = (values: ExitAnimationsValues, anchor: LayoutRectangle) => {
        'worklet'
        // Define the center point for the exit animation
        const originX = anchor.x + anchor.width / 2
        const originY = anchor.y + anchor.height / 2

        // Animations: shrink to zero width/height at the center point
        const animations = {
            originX: withTiming(originX, { duration: 200 }),
            originY: withTiming(originY, { duration: 200 }),
            height: withTiming(0, { duration: 200 }),
            width: withTiming(0, { duration: 200 }),
        }

        // Initial values for the exit animation start from the current state
        const initialValues = {
            originX: values.currentOriginX,
            originY: values.currentOriginY,
            width: values.currentWidth,
            height: values.currentHeight,
        }

        return { initialValues, animations }
    }

    const isOpen = openMenuId === idRef.current

    const onLayout = () => {
        if (!runAnimation.current || !anchor) return
        runAnimation.current = false
        if (viewRef.current) {
            viewRef.current.measure((x, y, width, height) => {
                const { left, top } = getMenuPosition(anchor, placement, width, height)

                if (initial.current) {
                    menuTop.value = anchor.y + anchor.height / 2
                    menuLeft.value = anchor.x + anchor.width / 2
                    menuHeight.value = 0
                    menuWidth.value = 0
                    initial.current = false
                    menuOpacity.value = withTiming(1, { duration: 350 })
                }
                menuTop.value = withTiming(top, { duration: 200 })
                menuLeft.value = withTiming(left, { duration: 200 })
                menuHeight.value = withTiming(height, { duration: 200 })
                menuWidth.value = withTiming(width, { duration: 200 })
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
                                return exitingAnimation(values, anchor)
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

//////////////////////
// Menu Buttons
//////////////////////

const MenuButtons = ({
    buttons,
    onClose,
    expandedSubmenus,
    setExpandedSubmenus,
}: {
    buttons: ContextMenuButtonProps[]
    onClose: () => void
    expandedSubmenus: string | null
    setExpandedSubmenus: (key: string | null) => void
}) => {
    return (
        <View style={styles.menu}>
            {buttons.map((btn, idx) => {
                const key = btn.key ?? `btn-${idx}`
                const hasSubmenu = !!btn.submenu

                return (
                    <View key={key}>
                        <Pressable
                            style={styles.menuItem}
                            onPress={() => {
                                if (hasSubmenu) {
                                    setExpandedSubmenus(expandedSubmenus === key ? null : key)
                                } else {
                                    btn.onPress?.()
                                    onClose()
                                }
                            }}>
                            <Text>{btn.label}</Text>
                            {hasSubmenu && (
                                <Text style={{ marginLeft: 8 }}>
                                    {expandedSubmenus === key ? '▲' : '▶'}
                                </Text>
                            )}
                        </Pressable>

                        {hasSubmenu && expandedSubmenus === key && (
                            <View style={styles.subMenu}>
                                <MenuButtons
                                    buttons={btn.submenu!}
                                    onClose={onClose}
                                    expandedSubmenus={expandedSubmenus}
                                    setExpandedSubmenus={setExpandedSubmenus}
                                />
                            </View>
                        )}
                    </View>
                )
            })}
        </View>
    )
}

//////////////////////
// Helpers
//////////////////////

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

//////////////////////
// Styles
//////////////////////

const styles = StyleSheet.create({
    menuContainer: {
        position: 'absolute',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
    },
    menu: {
        backgroundColor: 'white',
        borderRadius: 8,
        paddingVertical: 4,
        elevation: 5,
    },
    menuItem: {
        flex: 1,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subMenu: {
        paddingLeft: 12,
        backgroundColor: '#f9f9f9',
    },
})

export default ContextMenu
