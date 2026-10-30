import type { RefObject } from 'react'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import InputSheet from '@components/views/InputSheet'
import { Characters } from '@lib/state/characters'
import { Logger } from '@lib/state/Logger'

type CharacterNewMenuProps = {
    navigationPending: RefObject<boolean>
}

const CharacterNewMenu: React.FC<CharacterNewMenuProps> = ({ navigationPending }) => {
    const { t } = useTranslation()
    const { selectCharacterCard } = Characters.useCharacterState(
        useShallow((state) => ({
            selectCharacterCard: state.setCard,
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
        if (navigationPending.current) return
        navigationPending.current = true
        try {
            const id = await Characters.db.create.blankCard(text)
            selectCharacterCard(id)
            router.push('/characterEditor')
        } finally {
            navigationPending.current = false
        }
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
                            Characters.actions.importCards()
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
