import Alert from '@components/views/Alert'
import PopupMenu, { MenuRef } from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { saveStringToDownload } from '@lib/utils/File'
import React, { useState } from 'react'
import { View } from 'react-native'

type ChatEditPopupProps = {
    item: Awaited<ReturnType<typeof Chats.db.query.chatListQuery>>[0]
}

const ChatEditPopup: React.FC<ChatEditPopupProps> = ({ item }) => {
    const [showRename, setShowRename] = useState<boolean>(false)

    const { charName, charId } = Characters.useCharacterCard((state) => ({
        charId: state.id,
        charName: state.card?.name ?? 'Unknown',
    }))

    const { userId, userName } = Characters.useUserCard((state) => ({
        userId: state.id,
        userName: state.card?.name,
    }))

    const { deleteChat, loadChat, chatId, unloadChat } = Chats.useChat()

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
                        if (charId && chatId === item.id) {
                            const returnedChatId = await Chats.db.query.chatNewestId(charId)
                            const chatId = returnedChatId
                                ? returnedChatId
                                : await Chats.db.mutate.createChat(charId)
                            chatId && (await loadChat(chatId))
                        } else if (item.id === chatId) {
                            Logger.errorToast(`Something went wrong with creating a default chat`)
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
        const name = `Chatlogs-${charName}-${item.id}.json`.replaceAll(' ', '_')
        await saveStringToDownload(JSON.stringify(await Chats.db.query.chat(item.id)), name, 'utf8')
        menuRef.current?.close()
        Logger.infoToast(`File: ${name} saved to downloads!`)
    }

    const handleLinkUser = async () => {
        if (userId === item.user_id) return
        if (!userId) {
            Logger.errorToast('No current User')
            return
        }
        await Chats.db.mutate.updateUser(item.id, userId)
        Logger.errorToast(`Linked to User: ${userName}`)
    }

    return (
        <View>
            <TextBoxModal
                booleans={[showRename, setShowRename]}
                onConfirm={async (text) => {
                    await Chats.db.mutate.renameChat(item.id, text)
                }}
                textCheck={(text) => text.length === 0}
                defaultValue={item.name}
            />
            <PopupMenu
                icon="edit"
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
                        label: 'Link User',
                        icon: 'user',
                        onPress: handleLinkUser,
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
