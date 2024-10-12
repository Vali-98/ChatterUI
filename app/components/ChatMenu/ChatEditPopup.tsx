import PopupMenu from '@components/PopupMenu'
import TextBoxModal from '@components/TextBoxModal'
import { Characters, Chats, Logger, saveStringToDownload } from '@globals'
import React, { useState } from 'react'
import { Alert, View } from 'react-native'
import { Menu } from 'react-native-popup-menu'

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

const ChatEditPopup: React.FC<ChatEditPopupProps> = ({ item, setNowLoading, nowLoading }) => {
    const [showRename, setShowRename] = useState<boolean>(false)

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

    const handleDeleteChat = (menuRef: React.MutableRefObject<Menu | null>) => {
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

    const handleCloneChat = (menuRef: React.MutableRefObject<Menu | null>) => {
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

    const handleExportChat = async (menuRef: React.MutableRefObject<Menu | null>) => {
        const name = `Chatlogs-${charName}-${item.id}`.replaceAll(' ', '_')
        await saveStringToDownload(JSON.stringify(await Chats.db.query.chat(item.id)), name, 'utf8')
        menuRef.current?.close()
        Logger.log(`File: ${name} saved to downloads!`, true)
    }

    return (
        <View>
            <TextBoxModal
                booleans={[showRename, setShowRename]}
                onConfirm={async (text) => {
                    await Chats.db.mutate.renameChat(item.id, text)
                }}
                textCheck={(text) => text.length === 0}
            />
            <PopupMenu
                icon="edit"
                disabled={nowLoading}
                options={[
                    {
                        label: 'Rename',
                        icon: 'edit',
                        onPress: (menuRef) => {
                            setShowRename(true)
                            menuRef.current?.close()
                        },
                        closeOnExit: true,
                    },
                    {
                        label: 'Export',
                        icon: 'download',
                        onPress: (menuRef) => handleExportChat(menuRef),
                        closeOnExit: true,
                    },
                    {
                        label: 'Clone',
                        icon: 'copy1',
                        onPress: handleCloneChat,
                        closeOnExit: true,
                    },
                    {
                        label: 'Delete',
                        icon: 'delete',
                        warning: true,
                        onPress: handleDeleteChat,
                        closeOnExit: true,
                    },
                ]}
            />
        </View>
    )
}

export default ChatEditPopup
