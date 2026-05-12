import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import ContextMenu from '@components/views/ContextMenu'
import InputSheet from '@components/views/InputSheet'
import { Characters } from '@lib/state/Characters'
import { Logger } from '@lib/state/Logger'

type CharacterNewMenuProps = {
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

const CharacterNewMenu: React.FC<CharacterNewMenuProps> = ({ nowLoading, setNowLoading }) => {
    const { t } = useTranslation()
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
            Logger.errorToast(t('character.list.errors.nameEmpty'))
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
            <InputSheet
                visible={showNewChar}
                setVisible={setShowNewChar}
                title={t('character.list.actions.createNewCharacter')}
                onConfirm={handleCreateCharacter}
                verifyText={(text) =>
                    text.length === 0 ? t('character.list.errors.nameCannotBeEmpty') : ''
                }
                placeholder="Name..."
                autoFocus
            />

            <ContextMenu
                triggerIcon="user-add"
                buttons={[
                    {
                        label: t('character.list.actions.importFromFile'),
                        onPress: (close) => {
                            Characters.importCharacter()
                            close()
                        },
                        icon: 'upload',
                    },
                    {
                        label: t('character.list.actions.createCharacter'),
                        onPress: (close) => {
                            setShowNewChar(true)
                            close()
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
