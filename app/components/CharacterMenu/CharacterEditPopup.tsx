import { CharInfo } from '@constants/Characters'
import { AntDesign, FontAwesome } from '@expo/vector-icons'
import { Characters, Style } from '@globals'
import { useFocusEffect, useRouter } from 'expo-router'
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

type CharacterEditPopupProps = {
    characterInfo: CharInfo
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

type PopupProps = {
    onPress: () => void | Promise<void>
    label: string
    iconName: 'copy' | 'pencil' | 'trash'
    warning?: boolean
}

const PopupOption: React.FC<PopupProps> = ({ onPress, label, iconName, warning = false }) => {
    return (
        <MenuOption>
            <TouchableOpacity style={styles.popupButton} onPress={onPress}>
                <FontAwesome
                    style={{ minWidth: 20 }}
                    name={iconName}
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

const CharacterEditPopup: React.FC<CharacterEditPopupProps> = ({
    characterInfo,
    setNowLoading,
    nowLoading,
}) => {
    const [showMenu, setShowMenu] = useState<boolean>(false)
    const menuRef: React.MutableRefObject<Menu | null> = useRef(null)
    const router = useRouter()

    const { setCurrentCard, unloadCard } = Characters.useCharacterCard((state) => ({
        setCurrentCard: state.setCard,
        unloadCard: state.unloadCard,
    }))

    const deleteCard = () => {
        Alert.alert(
            `Delete Character`,
            `Are you sure you want to delete '${characterInfo.name}'? This cannot be undone.`,
            [
                { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        Characters.db.mutate.deleteCard(characterInfo.id ?? -1)
                        unloadCard()
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        )
    }

    const cloneCard = () => {
        Alert.alert(
            `Clone Character`,
            `Are you sure you want to clone '${characterInfo.name}'?`,
            [
                { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setNowLoading(true)
                        await Characters.db.mutate.duplicateCard(characterInfo.id)
                        menuRef.current?.close()
                        setNowLoading(false)
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        )
    }

    const editCharacter = async () => {
        if (nowLoading) return
        setNowLoading(true)
        await setCurrentCard(characterInfo.id)
        setNowLoading(false)
        menuRef.current?.close()
        router.push('/CharInfo')
    }

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
                placement: 'left',
                anchorStyle: styles.anchor,
                openAnimationDuration: 150,
                closeAnimationDuration: 0,
            }}>
            <MenuTrigger disabled={nowLoading}>
                <AntDesign
                    style={styles.triggerButton}
                    color={Style.getColor(showMenu ? 'primary-text3' : 'primary-text2')}
                    name="edit"
                    size={26}
                />
            </MenuTrigger>
            <MenuOptions customStyles={menustyle}>
                <PopupOption onPress={() => editCharacter()} label="Edit" iconName="pencil" />
                <PopupOption
                    onPress={() => {
                        cloneCard()
                    }}
                    label="Clone"
                    iconName="copy"
                />
                <PopupOption onPress={() => deleteCard()} label="Delete" iconName="trash" warning />
            </MenuOptions>
        </Menu>
    )
}

export default CharacterEditPopup

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
