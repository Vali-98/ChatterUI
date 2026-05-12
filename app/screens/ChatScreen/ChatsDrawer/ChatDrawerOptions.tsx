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
            charName: state.card?.name ?? t('chat.drawer.labels.unknown'),
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
            title: t('chat.drawer.dialogs.delete.title'),
            description: t('chat.drawer.dialogs.delete.description', { name: item.name }),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('chat.drawer.dialogs.delete.confirm'),
                    onPress: async () => {
                        await Chats.db.mutate.deleteChat(item.id)
                        if (charId && chatId === item.id) {
                            const returnedChatId = await Chats.db.query.chatNewestId(charId)
                            const chatId = returnedChatId
                                ? returnedChatId
                                : await Chats.db.mutate.createChat(charId)
                            chatId && (await setId(chatId))
                        } else if (item.id === chatId) {
                            Logger.errorToast(t('chat.drawer.errors.defaultChatFailed'))
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
            title: t('chat.drawer.dialogs.clone.title'),
            description: t('chat.drawer.dialogs.clone.description', { name: item.name }),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('chat.drawer.dialogs.clone.confirm'),
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
                Logger.infoToast(t('chat.drawer.messages.exported', { name }))
            } catch (e) {
                Logger.errorToast(t('chat.drawer.errors.exportFailed'))
                Logger.error(`${e}`)
            }
        } else {
            Logger.errorToast(t('chat.drawer.errors.undefinedChat'))
        }
        close()
    }

    const handleLinkUser = async (close: () => void) => {
        if (userId === item.user_id) {
            Logger.warnToast(t('chat.drawer.user.alreadySet'))
            close()
            return
        }
        if (!userId) {
            Logger.errorToast(t('chat.drawer.user.noneSelected'))
            close()
            return
        }
        await Chats.db.mutate.updateUser(item.id, userId)
        Logger.infoToast(t('chat.drawer.user.linked', { name: userName }))
        close()
    }

    return (
        <>
            <InputSheet
                title={t('common.actions.rename')}
                visible={showRename}
                setVisible={setShowRename}
                onConfirm={async (text) => {
                    await Chats.db.mutate.renameChat(item.id, text)
                }}
                verifyText={(text) =>
                    text.length === 0 ? t('chat.drawer.rename.errors.nameCannotBeEmpty') : ''
                }
                defaultValue={item.name}
            />
            <ContextMenu
                placement="right"
                longPress
                onPress={onPress}
                buttons={[
                    {
                        label: t('common.actions.rename'),
                        icon: 'edit',
                        onPress: (close) => {
                            setShowRename(true)
                            close()
                        },
                    },
                    {
                        label: t('common.actions.delete'),
                        icon: 'delete',
                        variant: 'warning',
                        onPress: handleDeleteChat,
                    },
                    {
                        label: t('common.actions.more'),
                        submenu: [
                            {
                                label: t('common.actions.export'),
                                icon: 'download',
                                onPress: handleExportChat,
                            },
                            {
                                label: t('common.actions.clone'),
                                icon: 'copy',
                                onPress: handleCloneChat,
                            },
                            {
                                label: t('chat.drawer.user.linkAction'),
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
