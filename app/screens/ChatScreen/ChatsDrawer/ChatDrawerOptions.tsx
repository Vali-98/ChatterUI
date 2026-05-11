import React, { ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import InputSheet from '@components/views/InputSheet'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { saveStringToDownload } from '@lib/utils/File'

type ChatEditPopupProps = {
    item: Awaited<ReturnType<typeof Chats.db.query.chatListQuery>>[0]
    children: ReactNode
    onPress: () => void
}

const ChatEditPopup: React.FC<ChatEditPopupProps> = ({ item, children, onPress }) => {
    const { t } = useTranslation()
    const [showRename, setShowRename] = useState<boolean>(false)

    const { charName, charId } = Characters.useCharacterStore(
        useShallow((state) => ({
            charId: state.id,
            charName: state.card?.name ?? t('chat.drawer.unknown'),
        }))
    )

    const { userId, userName } = Characters.useUserStore(
        useShallow((state) => ({
            userId: state.id,
            userName: state.card?.name,
        }))
    )

    const { setId, chatId, resetId } = Chats.useChat()

    const handleDeleteChat = (close: () => void) => {
        Alert.alert({
            title: t('chat.drawer.delete.title'),
            description: t('chat.drawer.delete.description', { name: item.name }),
            buttons: [
                { label: t('common.cancel') },
                {
                    label: t('chat.drawer.delete.confirm'),
                    onPress: async () => {
                        await Chats.db.mutate.deleteChat(item.id)
                        if (charId && chatId === item.id) {
                            const returnedChatId = await Chats.db.query.chatNewestId(charId)
                            const chatId = returnedChatId
                                ? returnedChatId
                                : await Chats.db.mutate.createChat(charId)
                            chatId && (await setId(chatId))
                        } else if (item.id === chatId) {
                            Logger.errorToast(t('chat.drawer.defaultchatfailed'))
                            resetId()
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
            title: t('chat.drawer.clone.title'),
            description: t('chat.drawer.clone.description', { name: item.name }),
            buttons: [
                { label: t('common.cancel') },
                {
                    label: t('chat.drawer.clone.confirm'),
                    onPress: async () => {
                        await Chats.db.mutate.cloneChatFromId(item.id)
                        close()
                    },
                },
            ],
        })
    }

    const handleExportChat = async (close: () => void) => {
        // eslint-disable-next-line i18next/no-literal-string
        const name = `Chatlogs-${charName}-${item.id}.json`.replaceAll(' ', '_')
        const chat = await Chats.db.query.chat(item.id)
        if (chat) {
            try {
                await saveStringToDownload(JSON.stringify(chat), name, 'utf8')
                Logger.infoToast(t('chat.drawer.exported', { name }))
            } catch (e) {
                Logger.errorToast(t('chat.drawer.exportfailed'))
                Logger.error(`${e}`)
            }
        } else {
            Logger.errorToast(t('chat.drawer.undefined'))
        }
        close()
    }

    const handleLinkUser = async (close: () => void) => {
        if (userId === item.user_id) {
            Logger.warnToast(t('chat.drawer.useralreadyset'))
            close()
            return
        }
        if (!userId) {
            Logger.errorToast(t('chat.drawer.nouser'))
            close()
            return
        }
        await Chats.db.mutate.updateUser(item.id, userId)
        Logger.infoToast(t('chat.drawer.linkeduser', { name: userName }))
        close()
    }

    return (
        <>
            <InputSheet
                title={t('chat.drawer.rename.title')}
                visible={showRename}
                setVisible={setShowRename}
                onConfirm={async (text) => {
                    await Chats.db.mutate.renameChat(item.id, text)
                }}
                verifyText={(text) =>
                    text.length === 0 ? t('chat.drawer.rename.namecannotbeempty') : ''
                }
                defaultValue={item.name}
            />
            <ContextMenu
                placement="right"
                longPress
                onPress={onPress}
                buttons={[
                    {
                        label: t('chat.drawer.rename.action'),
                        icon: 'edit',
                        onPress: (close) => {
                            setShowRename(true)
                            close()
                        },
                    },
                    {
                        label: t('common.delete'),
                        icon: 'delete',
                        variant: 'warning',
                        onPress: handleDeleteChat,
                    },
                    {
                        label: t('common.more'),
                        submenu: [
                            {
                                label: t('common.export'),
                                icon: 'download',
                                onPress: handleExportChat,
                            },
                            {
                                label: t('common.clone'),
                                icon: 'copy',
                                onPress: handleCloneChat,
                            },
                            {
                                label: t('chat.drawer.linkuser.action'),
                                icon: 'user',
                                onPress: handleLinkUser,
                            },
                        ],
                    },
                ]}>
                {children}
            </ContextMenu>
        </>
    )
}

export default ChatEditPopup
