import { AntDesign } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { useFocusEffect } from 'expo-router'
import React, { ReactNode, useRef, useState } from 'react'
import { StyleSheet, TouchableOpacity, Text, BackHandler, TextStyle } from 'react-native'
import {
    Menu,
    MenuOption,
    MenuOptions,
    MenuOptionsCustomStyle,
    MenuTrigger,
    renderers,
} from 'react-native-popup-menu'

const { Popover } = renderers

export type MenuRef = React.MutableRefObject<Menu | null>

type PopupOptionProps = {
    label: string
    icon: keyof typeof AntDesign.glyphMap
    onPress: (m: MenuRef) => void | Promise<void>
    warning?: boolean
    menuRef: MenuRef
}

type MenuOptionProp = Omit<PopupOptionProps, 'menuRef'>

type PopupMenuProps = {
    disabled?: boolean
    icon?: keyof typeof AntDesign.glyphMap
    iconSize?: number
    style?: TextStyle
    options: MenuOptionProp[]
    placement?: 'top' | 'right' | 'bottom' | 'left' | 'auto'
    children?: ReactNode
}

const PopupOption: React.FC<PopupOptionProps> = ({
    onPress,
    label,
    icon,
    menuRef,
    warning = false,
}) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const handleOnPress = async () => {
        await onPress(menuRef)
    }

    return (
        <MenuOption>
            <TouchableOpacity style={styles.popupButton} onPress={handleOnPress}>
                <AntDesign
                    style={{ minWidth: 20 }}
                    name={icon}
                    size={18}
                    color={warning ? color.error._300 : color.text._100}
                />
                <Text style={warning ? styles.optionLabelWarning : styles.optionLabel}>
                    {label}
                </Text>
            </TouchableOpacity>
        </MenuOption>
    )
}

const PopupMenu: React.FC<PopupMenuProps> = ({
    disabled,
    icon,
    iconSize = 26,
    style = {},
    options,
    children,
    placement = 'left',
}) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const menuStyle = useMenuStyle()
    const [showMenu, setShowMenu] = useState<boolean>(false)
    const menuRef: MenuRef = useRef(null)

    const backAction = () => {
        if (!menuRef.current || !menuRef.current?.isOpen()) return false
        menuRef.current?.close()
        return true
    }

    useFocusEffect(() => {
        BackHandler.removeEventListener('hardwareBackPress', backAction)
        const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
        return () => handler.remove()
    })

    return (
        <Menu
            ref={menuRef}
            onOpen={() => setShowMenu(true)}
            onClose={() => setShowMenu(false)}
            renderer={Popover}
            rendererProps={{
                placement: placement,
                anchorStyle: styles.anchor,
                openAnimationDuration: 150,
                closeAnimationDuration: 0,
            }}>
            <MenuTrigger disabled={disabled}>
                {icon && (
                    <AntDesign
                        style={style}
                        color={showMenu ? color.text._500 : color.text._300}
                        name={icon}
                        size={iconSize}
                    />
                )}
                {children}
            </MenuTrigger>
            <MenuOptions customStyles={menuStyle}>
                {options.map((item) => (
                    <PopupOption {...item} key={item.label} menuRef={menuRef} />
                ))}
            </MenuOptions>
        </Menu>
    )
}

export default PopupMenu

const useMenuStyle = (): MenuOptionsCustomStyle => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    return {
        optionsContainer: {
            backgroundColor: color.neutral._200,
            padding: spacing.sm,
            borderRadius: borderRadius.l,
        },
        optionsWrapper: {
            backgroundColor: color.neutral._200,
        },
    }
}

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()

    return StyleSheet.create({
        anchor: {
            backgroundColor: color.primary._300,
            padding: 4,
        },

        popupButton: {
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: spacing.l,
            paddingVertical: spacing.l,
            paddingRight: spacing.xl2,
            paddingLeft: spacing.l,
            borderRadius: spacing.l,
        },

        headerButtonContainer: {
            flexDirection: 'row',
        },

        optionLabel: {
            color: color.text._100,
        },

        optionLabelWarning: {
            fontWeight: '500',
            color: color.error._300,
        },
    })
}
