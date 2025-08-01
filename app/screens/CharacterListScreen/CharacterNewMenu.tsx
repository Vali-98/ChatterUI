import PopupMenu from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { Characters } from '@lib/state/Characters'
import { Logger } from '@lib/state/Logger'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

type CharacterNewMenuProps = {
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

const CharacterNewMenu: React.FC<CharacterNewMenuProps> = ({ nowLoading, setNowLoading }) => {
    const { setCurrentCard } = Characters.useCharacterStore(
        useShallow((state) => ({
            setCurrentCard: state.setCard,
            id: state.id,
        }))
    )

    const router = useRouter()
    const [showNewChar, setShowNewChar] = useState<boolean>(false)

    const handleCreateCharacter = async (text: string) => {
        if (!text) {
            Logger.errorToast('Name Cannot Be Empty!')
            return
        }
        Characters.db.mutate.createCard(text).then(async (id) => {
            if (nowLoading) return
            setNowLoading(true)
            await setCurrentCard(id)
            setNowLoading(false)
            router.push('/screens/CharacterEditorScreen')
        })
    }

    return (
        <>
            <TextBoxModal
                booleans={[showNewChar, setShowNewChar]}
                title="Create New Character"
                onConfirm={handleCreateCharacter}
                placeholder="Name..."
            />

            <PopupMenu
                icon="adduser"
                options={[
                    {
                        label: 'Import From File',
                        onPress: (menu) => {
                            Characters.importCharacter()
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
        </>
    )
}

export default CharacterNewMenu
