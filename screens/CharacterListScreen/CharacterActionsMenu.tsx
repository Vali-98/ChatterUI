import { usePathname, useRouter } from 'expo-router'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import { useConnectionStore } from '@lib/engine/API/connectionStore'
import { CharacterCardSummary, Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/chat'
import { Instructs } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { useSamplerStore } from '@lib/state/samplerStore'

type CharacterActionsMenuProps = {
    character: CharacterCardSummary
    isLoading: boolean
    setIsLoading: (b: boolean) => void
    children: ReactNode
}

const CharacterActionsMenu: React.FC<CharacterActionsMenuProps> = ({
    character,
    setIsLoading,
    isLoading,
    children,
}) => {
    const { t } = useTranslation()
    const path = usePathname()
    const router = useRouter()

    const { setId } = Chats.useChat()
    const selectUserCard = Characters.useUserStore((state) => state.setCard)
    const setInstruct = Instructs.useInstruct((state) => state.load)
    const setConnection = useConnectionStore((state) => state.setActiveConnection)
    const setSampler = useSamplerStore((state) => state.setCurrentConfig)

    const handleOpenChat = async () => {
        if (isLoading || path === '/chat' || !character.id) return
        try {
            setIsLoading(true)
            await selectCharacterCard(character.id)
            character?.links.forEach((item) => {
                switch (item.type) {
                    case 'user_id':
                        Logger.info(t('character.editor.links.loadUser', { value: item.value }))
                        selectUserCard(item.value)
                        break
                    case 'instruct_id':
                        Logger.info(t('character.editor.links.loadInstruct', { value: item.value }))
                        setInstruct(item.value)
                        break
                    case 'connection_id':
                        Logger.info(
                            t('character.editor.links.loadConnection', { value: item.value })
                        )
                        setConnection(item.value)
                        break
                    case 'sampler_id':
                        Logger.info(t('character.editor.links.loadSampler', { value: item.value }))
                        setSampler(item.value)
                        break
                }
            })
            let chatId = character.latestChatId
            if (!chatId) {
                chatId = await Chats.actions.createChat(character.id)
            }
            if (!chatId) {
                Logger.errorToast(t('character.list.errors.chatCreationFailed'))
                return
            }
            await setId(chatId)
            setIsLoading(false)
            router.push('/chat')
        } catch (error) {
            Logger.errorToast(t('character.list.errors.load', { error }))
            setIsLoading(false)
        }
    }

    const selectCharacterCard = Characters.useCharacterState((state) => state.setCard)

    const handleDeleteCard = (close: () => void) => {
        close()
        Alert.alert({
            title: t('character.editor.dialogs.deleteCharacter.title'),
            description: t('character.editor.dialogs.deleteCharacter.description', {
                name: character.name,
            }),
            buttons: [
                {
                    label: t('common.actions.cancel'),
                },
                {
                    label: t('character.editor.dialogs.deleteCharacter.confirm'),
                    onPress: async () => {
                        await Characters.actions.deleteCard(character.id ?? -1)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const handleDuplicateCard = (close: () => void) => {
        close()
        Alert.alert({
            title: t('character.editor.dialogs.clone.title'),
            description: t('character.editor.dialogs.clone.description', { name: character.name }),
            buttons: [
                {
                    label: t('common.actions.cancel'),
                },
                {
                    label: t('character.editor.dialogs.clone.confirm'),
                    onPress: async () => {
                        setIsLoading(true)
                        await Characters.actions.duplicateCard(character.id)

                        setIsLoading(false)
                    },
                },
            ],
        })
    }

    const handleEditCard = async (close: () => void) => {
        if (isLoading) return
        setIsLoading(true)
        await selectCharacterCard(character.id)
        setIsLoading(false)
        close()
        router.push('/characterEditor')
    }

    return (
        <ContextMenu disabled={isLoading || path !== '/'} placement="center">
            <ContextMenu.Trigger onPress={handleOpenChat} longPress delayLongPress={300}>
                <View pointerEvents="none">{children}</View>
            </ContextMenu.Trigger>
            <ContextMenu.Body>
                <ContextMenu.Button
                    label={t('common.actions.edit')}
                    icon="edit"
                    closeOnPress={false}
                    onPress={handleEditCard}
                />
                <ContextMenu.Button
                    label={t('common.actions.clone')}
                    icon="copy"
                    closeOnPress={false}
                    onPress={handleDuplicateCard}
                />
                <ContextMenu.Button
                    label={t('common.actions.delete')}
                    icon="delete"
                    closeOnPress={false}
                    onPress={handleDeleteCard}
                    variant="warning"
                />
            </ContextMenu.Body>
        </ContextMenu>
    )
}

export default CharacterActionsMenu
