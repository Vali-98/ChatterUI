import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useBottomSheetRef } from '@components/views/BottomSheet'
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
    const inputRef = useBottomSheetRef()

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
                ref={inputRef}
                title={t('character.list.actions.createNewCharacter')}
                onConfirm={handleCreateCharacter}
                verifyText={(text) =>
                    text.length === 0 ? t('character.list.errors.nameCannotBeEmpty') : ''
                }
                placeholder="Name..."
                autoFocus
                confirmLabel={t('common.actions.create')}
            />

            <ContextMenu placement="bottom">
                <ContextMenu.Trigger icon="user-add" />
                <ContextMenu.Body>
                    <ContextMenu.Button
                        label={t('character.list.actions.importFromFile')}
                        onPress={() => {
                            Characters.importCharacter()
                        }}
                        icon="upload"
                    />
                    <ContextMenu.Button
                        label={t('character.list.actions.createCharacter')}
                        onPress={() => {
                            inputRef.current?.open()
                        }}
                        icon="edit"
                    />
                </ContextMenu.Body>
            </ContextMenu>
        </>
    )
}

export default CharacterNewMenu
