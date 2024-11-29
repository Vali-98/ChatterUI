import Alert from '@components/Alert'
import PopupMenu, { MenuRef } from '@components/PopupMenu'
import TextBoxModal from '@components/TextBoxModal'
import { Characters, Chats, Logger, saveStringToDownload } from '@globals'
import React, { useState } from 'react'
import { View } from 'react-native'

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
        charName: state.card?.name ?? 'Unknown',
    }))

    const { deleteChat, loadChat, currentChatId, unloadChat } = Chats.useChat((state) => ({
        deleteChat: state.delete,
        loadChat: state.load,
        currentChatId: state.data?.id,
        unloadChat: state.reset,
    }))

    const handleDeleteChat = (menuRef: MenuRef) => {
        Alert.alert({
            title: `Delete Chat`,
            description: `Are you sure you want to delete '${item.name}'? This cannot be undone.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Chat',
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
                    type: 'warning',
                },
            ],
        })
    }

    const handleCloneChat = (menuRef: MenuRef) => {
        Alert.alert({
            title: `Clone Chat`,
            description: `Are you sure you want to clone '${item.name}'?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Clone Chat',
                    onPress: async () => {
                        await Chats.db.mutate.cloneChat(item.id)
                        menuRef.current?.close()
                    },
                },
            ],
        })
    }

    const handleExportChat = async (menuRef: MenuRef) => {
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
                    },
                    {
                        label: 'Export',
                        icon: 'download',
                        onPress: (menuRef) => handleExportChat(menuRef),
                    },
                    {
                        label: 'Clone',
                        icon: 'copy1',
                        onPress: handleCloneChat,
                    },
                    {
                        label: 'Delete',
                        icon: 'delete',
                        warning: true,
                        onPress: handleDeleteChat,
                    },
                ]}
            />
        </View>
    )
}

export default ChatEditPopup
