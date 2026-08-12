import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Platform } from 'react-native'
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

    const handleImportFolder = async () => {
        if (nowLoading) return
        setNowLoading(true)
        try {
            const counts = await Characters.importCharacterFolder()
            if (!counts) return
            Alert.alert(
                'Folder Import Complete',
                `Imported: ${counts.imported}\nSkipped: ${counts.skipped}\nFailed: ${counts.failed}`
            )
        } catch (error) {
            Logger.error(`Failed to import character folder: ${error}`)
            Alert.alert('Folder Import Failed', 'The selected folder could not be read.')
        } finally {
            setNowLoading(false)
        }
    }

    return (
        <>
            <InputSheet
                visible={showNewChar}
                setVisible={setShowNewChar}
                title="Create New Character"
                onConfirm={handleCreateCharacter}
                verifyText={(text) => (text.length === 0 ? 'Name cannot be empty' : '')}
                placeholder="Name..."
                autoFocus
            />

            <ContextMenu
                triggerIcon="user-add"
                buttons={[
                    {
                        label: 'Import From File',
                        onPress: (close) => {
                            Characters.importCharacter()
                            close()
                        },
                        icon: 'upload',
                    },
                    ...(Platform.OS === 'android'
                        ? [
                              {
                                  label: 'Import Folder',
                                  onPress: (close: () => void) => {
                                      close()
                                      void handleImportFolder()
                                  },
                                  icon: 'folder-open' as const,
                              },
                          ]
                        : []),
                    {
                        label: 'Create Character',
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
