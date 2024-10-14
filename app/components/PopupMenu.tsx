import { AntDesign } from '@expo/vector-icons'
import { Style } from '@globals'
import { useFocusEffect } from 'expo-router'
import React, { useRef, useState } from 'react'
import { StyleSheet, TouchableOpacity, Text, BackHandler, Alert } from 'react-native'
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
    closeOnExit?: boolean
    menuRef: MenuRef
}

type MenuOptionProp = Omit<PopupOptionProps, 'menuRef'>

type PopupMenuProps = {
    disabled: boolean
    icon: keyof typeof AntDesign.glyphMap
    options: MenuOptionProp[]
    placement?: 'top' | 'right' | 'bottom' | 'left' | 'auto'
}

const PopupOption: React.FC<PopupOptionProps> = ({
    onPress,
    label,
    icon,
    menuRef,
    warning = false,
}) => {
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
                    color={Style.getColor(warning ? 'destructive-brand' : 'primary-text2')}
                />
                <Text style={warning ? styles.optionLabelWarning : styles.optionLabel}>
                    {label}
                </Text>
            </TouchableOpacity>
        </MenuOption>
    )
}

const PopupMenu: React.FC<PopupMenuProps> = ({ disabled, icon, options, placement = 'left' }) => {
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
                <AntDesign
                    style={styles.triggerButton}
                    color={Style.getColor(showMenu ? 'primary-text3' : 'primary-text2')}
                    name={icon}
                    size={26}
                />
            </MenuTrigger>
            <MenuOptions customStyles={menustyle}>
                {options.map((item) => (
                    <PopupOption {...item} key={item.label} menuRef={menuRef} />
                ))}
            </MenuOptions>
        </Menu>
    )
}

export default PopupMenu

const styles = StyleSheet.create({
    anchor: {
        backgroundColor: Style.getColor('primary-surface3'),
        padding: 4,
    },

    popupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 12,
        paddingVertical: 12,
        paddingRight: 32,
        paddingLeft: 12,
        borderRadius: 12,
    },

    headerButtonContainer: {
        flexDirection: 'row',
    },

    optionLabel: {
        color: Style.getColor('primary-text1'),
    },

    optionLabelWarning: {
        fontWeight: '500',
        color: '#d2574b',
    },

    triggerButton: {
        paddingHorizontal: 12,
        paddingVertical: 20,
    },
})

const menustyle: MenuOptionsCustomStyle = {
    optionsContainer: {
        backgroundColor: Style.getColor('primary-surface3'),
        padding: 4,
        borderRadius: 12,
    },
    optionsWrapper: {
        backgroundColor: Style.getColor('primary-surface3'),
    },
}
