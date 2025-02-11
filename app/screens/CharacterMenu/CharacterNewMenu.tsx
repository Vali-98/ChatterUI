import PopupMenu from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

type CharacterNewMenuProps = {
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
    showMenu: boolean
    setShowMenu: (b: boolean) => void
}

const CharacterNewMenu: React.FC<CharacterNewMenuProps> = ({
    nowLoading,
    setNowLoading,
    showMenu,
    setShowMenu,
}) => {
    const { setCurrentCard } = Characters.useCharacterCard(
        useShallow((state) => ({
            setCurrentCard: state.setCard,
            id: state.id,
        }))
    )
    const { loadChat } = Chats.useChat()

    const router = useRouter()
    const [showNewChar, setShowNewChar] = useState<boolean>(false)
    const [showDownload, setShowDownload] = useState(false)

    const setCurrentCharacter = async (charId: number, edit: boolean = false) => {
        if (nowLoading) return

        try {
            await setCurrentCard(charId)
            setNowLoading(true)
            const returnedChatId = await Chats.db.query.chatNewestId(charId)
            let chatId = returnedChatId
            if (!chatId) {
                chatId = await Chats.db.mutate.createChat(charId)
            }
            if (!chatId) {
                Logger.errorToast('Chat creation backup has failed! Please report.')
                return
            }

            await loadChat(chatId)

            setNowLoading(false)
            if (edit) router.push('/CharacterEditor')
            else router.back()
        } catch (error) {
            Logger.errorToast(`Couldn't load character: ${error}`)
            setNowLoading(false)
        }
    }

    const handleCreateCharacter = async (text: string) => {
        if (!text) {
            Logger.errorToast('Name Cannot Be Empty!')
            return
        }
        Characters.db.mutate.createCard(text).then(async (id) => {
            await setCurrentCharacter(id)
        })
    }

    return (
        <View>
            <TextBoxModal
                booleans={[showNewChar, setShowNewChar]}
                title="Create New Character"
                onConfirm={handleCreateCharacter}
                placeholder="Name..."
            />

            <TextBoxModal
                title="Enter Character Hub or Pygmalion Link"
                booleans={[showDownload, setShowDownload]}
                onConfirm={(text) => Characters.importCharacterFromRemote(text)}
                showPaste
            />

            <PopupMenu
                icon="adduser"
                options={[
                    {
                        label: 'Download',
                        onPress: (menu) => {
                            menu.current?.close()
                            setShowDownload(true)
                        },

                        icon: 'clouddownload',
                    },
                    {
                        label: 'Import From File',
                        onPress: (menu) => {
                            Characters.importCharacterFromImage()
                            menu.current?.close()
                        },
                        icon: 'upload',
                    },
                    {
                        label: 'Create Character',
                        onPress: (menu) => {
                            setShowNewChar(true)
                            menu.current?.close()
                        },
                        icon: 'edit',
                    },
                ]}
                placement="bottom"
            />
        </View>
    )
}

export default CharacterNewMenu
