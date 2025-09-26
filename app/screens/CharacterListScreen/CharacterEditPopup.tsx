import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import { CharInfo, Characters } from '@lib/state/Characters'
import { useRouter } from 'expo-router'
import { View } from 'react-native'

type CharacterEditPopupProps = {
    characterInfo: CharInfo
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

const CharacterEditPopup: React.FC<CharacterEditPopupProps> = ({
    characterInfo,
    setNowLoading,
    nowLoading,
}) => {
    const router = useRouter()

    const setCurrentCard = Characters.useCharacterStore((state) => state.setCard)

    const deleteCard = (close: () => void) => {
        close()
        Alert.alert({
            title: 'Delete Character',
            description: `Are you sure you want to delete '${characterInfo.name}'? This cannot be undone.`,
            buttons: [
                {
                    label: 'Cancel',
                },
                {
                    label: 'Delete Character',
                    onPress: async () => {
                        Characters.db.mutate.deleteCard(characterInfo.id ?? -1)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const cloneCard = (close: () => void) => {
        Alert.alert({
            title: 'Clone Character',
            description: `Are you sure you want to clone '${characterInfo.name}'?`,
            buttons: [
                {
                    label: 'Cancel',
                },
                {
                    label: 'Clone Character',
                    onPress: async () => {
                        setNowLoading(true)
                        await Characters.db.mutate.duplicateCard(characterInfo.id)
                        close()
                        setNowLoading(false)
                    },
                },
            ],
        })
    }

    const editCharacter = async (close: () => void) => {
        if (nowLoading) return
        setNowLoading(true)
        await setCurrentCard(characterInfo.id)
        setNowLoading(false)
        close()
        router.push('/screens/CharacterEditorScreen')
    }

    return (
        <View style={{ paddingHorizontal: 6 }}>
            <ContextMenu
                triggerIcon="edit"
                buttons={[
                    { label: 'Edit', icon: 'edit', onPress: editCharacter },
                    { label: 'Clone', icon: 'copy1', onPress: cloneCard },
                    { label: 'Delete', icon: 'delete', onPress: deleteCard, variant: 'warning' },
                ]}
                placement="left"
            />
        </View>
    )
}

export default CharacterEditPopup
