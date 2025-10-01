import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { saveStringToDownload } from '@lib/utils/File'
import React, { useState } from 'react'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

type ChatEditPopupProps = {
    item: Awaited<ReturnType<typeof Chats.db.query.chatListQuery>>[0]
}

const ChatEditPopup: React.FC<ChatEditPopupProps> = ({ item }) => {
    const [showRename, setShowRename] = useState<boolean>(false)

    const { charName, charId } = Characters.useCharacterStore(
        useShallow((state) => ({
            charId: state.id,
            charName: state.card?.name ?? 'Unknown',
        }))
    )

    const { userId, userName } = Characters.useUserStore(
        useShallow((state) => ({
            userId: state.id,
            userName: state.card?.name,
        }))
    )

    const { deleteChat, loadChat, chatId, unloadChat } = Chats.useChat()

    const handleDeleteChat = (close: () => void) => {
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
                        close()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const handleCloneChat = (close: () => void) => {
        Alert.alert({
            title: `Clone Chat`,
            description: `Are you sure you want to clone '${item.name}'?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Clone Chat',
                    onPress: async () => {
                        await Chats.db.mutate.cloneChat(item.id)
                        close()
                    },
                },
            ],
        })
    }

    const handleExportChat = async (close: () => void) => {
        const name = `Chatlogs-${charName}-${item.id}.json`.replaceAll(' ', '_')
        const chat = await Chats.db.query.chat(item.id)
        if (chat) {
            try {
                await saveStringToDownload(JSON.stringify(chat), name, 'utf8')
                Logger.infoToast(`File: ${name} saved to downloads!`)
            } catch (e) {
                Logger.errorToast('Failed to export chat')
                Logger.error(`${e}`)
            }
        } else {
            Logger.errorToast('Chat is undefined')
        }
        close()
    }

    const handleLinkUser = async (close: () => void) => {
        if (userId === item.user_id) {
            Logger.warnToast('This User Is Already Set')
            close()
            return
        }
        if (!userId) {
            Logger.errorToast('No Current User')
            close()
            return
        }
        await Chats.db.mutate.updateUser(item.id, userId)
        Logger.infoToast(`Linked to User: ${userName}`)
        close()
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
            <ContextMenu
                triggerIcon="edit"
                placement="left"
                buttons={[
                    {
                        label: 'Rename',
                        icon: 'edit',
                        onPress: (close) => {
                            setShowRename(true)
                            close()
                        },
                    },
                    {
                        label: 'Delete',
                        icon: 'delete',
                        variant: 'warning',
                        onPress: handleDeleteChat,
                    },
                    {
                        label: 'More',
                        submenu: [
                            {
                                label: 'Export',
                                icon: 'download',
                                onPress: handleExportChat,
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
                        ],
                    },
                ]}
            />
        </View>
    )
}

export default ChatEditPopup
