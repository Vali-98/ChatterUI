import TextBoxModal from '@components/TextBoxModal'
import { AntDesign, FontAwesome } from '@expo/vector-icons'
import { Characters, Chats, Logger, saveStringToDownload, Style } from '@globals'
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

type ListItem = {
    id: number
    character_id: number
    create_date: Date
    name: string
    last_modified: null | number
    entryCount: number
}

type ChatEditPopupProps = {
    item: ListItem
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

type PopupProps = {
    onPress: () => void | Promise<void>
    label: string
    iconName: keyof typeof FontAwesome.glyphMap
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

const ChatEditPopup: React.FC<ChatEditPopupProps> = ({ item, setNowLoading, nowLoading }) => {
    const [showMenu, setShowMenu] = useState<boolean>(false)
    const [showRename, setShowRename] = useState<boolean>(false)
    const menuRef: React.MutableRefObject<Menu | null> = useRef(null)

    const { charName, charId } = Characters.useCharacterCard((state) => ({
        charId: state.id,
        charName: state.card?.data?.name ?? 'Unknown',
    }))

    const { deleteChat, loadChat, currentChatId, unloadChat } = Chats.useChat((state) => ({
        deleteChat: state.delete,
        loadChat: state.load,
        currentChatId: state.data?.id,
        unloadChat: state.reset,
    }))

    const handleDeleteChat = () => {
        Alert.alert(
            `Delete Character`,
            `Are you sure you want to delete '${item.name}'? This cannot be undone.`,
            [
                { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        await deleteChat(item.id)
                        if (charId && currentChatId === item.id) {
                            const returnedChatId = await Chats.db.query.chatNewestId(charId)
                            const chatId = returnedChatId
                                ? returnedChatId
                                : await Chats.db.mutate.createChat(charId)
                            chatId && (await loadChat(chatId))
                        } else if (item.id === currentChatId) {
                            Logger.log(`Something went wrong with creating a default chat`, true)
                            unloadChat()
                        }
                        menuRef.current?.close()
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        )
    }

    const handleCloneChat = () => {
        Alert.alert(
            `Clone Character`,
            `Are you sure you want to clone '${item.name}'?`,
            [
                { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        await Chats.db.mutate.cloneChat(item.id)
                        menuRef.current?.close()
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        )
    }

    const handleExportChat = async () => {
        const name = `Chatlogs-${charName}-${item.id}`.replaceAll(' ', '_')
        saveStringToDownload(JSON.stringify(await Chats.db.query.chat(item.id)), name, 'utf8')
        Logger.log(`File: ${name} saved to downloads!`, true)
        menuRef.current?.close()
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
                <TextBoxModal
                    booleans={[showRename, setShowRename]}
                    onConfirm={async (text) => {
                        await Chats.db.mutate.renameChat(item.id, text)
                    }}
                    onClose={() => menuRef.current?.close()}
                    textCheck={(text) => text.length === 0}
                />
                <PopupOption
                    onPress={() => {
                        setShowRename(true)
                    }}
                    label="Rename"
                    iconName="pencil"
                />

                <PopupOption
                    onPress={() => handleExportChat()}
                    label="Export"
                    iconName="download"
                />
                <PopupOption
                    onPress={() => {
                        handleCloneChat()
                    }}
                    label="Clone"
                    iconName="copy"
                />
                <PopupOption
                    onPress={() => handleDeleteChat()}
                    label="Delete"
                    iconName="trash"
                    warning
                />
            </MenuOptions>
        </Menu>
    )
}

export default ChatEditPopup

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
