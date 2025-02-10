import Alert from '@components/views/Alert'
import PopupMenu, { MenuRef } from '@components/views/PopupMenu'
import { CharInfo, Characters } from '@lib/state/Characters'
import { useRouter } from 'expo-router'

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

    const { setCurrentCard } = Characters.useCharacterCard((state) => ({
        setCurrentCard: state.setCard,
    }))

    const deleteCard = (menuRef: MenuRef) => {
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

    const cloneCard = (menuRef: MenuRef) => {
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
                        menuRef.current?.close()
                        setNowLoading(false)
                    },
                },
            ],
        })
    }

    const editCharacter = async (menuRef: MenuRef) => {
        if (nowLoading) return
        setNowLoading(true)
        await setCurrentCard(characterInfo.id)
        setNowLoading(false)
        menuRef.current?.close()
        router.push('/CharacterEditor')
    }

    return (
        <PopupMenu
            style={{ paddingHorizontal: 8 }}
            disabled={nowLoading}
            icon="edit"
            options={[
                { label: 'Edit', icon: 'edit', onPress: editCharacter },
                { label: 'Clone', icon: 'copy1', onPress: cloneCard },
                { label: 'Delete', icon: 'delete', onPress: deleteCard, warning: true },
            ]}
        />
    )
}

export default CharacterEditPopup
