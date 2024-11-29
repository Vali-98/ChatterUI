import Alert from '@components/Alert'
import Avatar from '@components/Avatar'
import PopupMenu from '@components/PopupMenu'
import { Characters, Style } from '@globals'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Menu } from 'react-native-popup-menu'

type CharacterData = Awaited<ReturnType<typeof Characters.db.query.cardListQuery>>[0]

type CharacterListingProps = {
    user: CharacterData
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
    setShowModal: (b: boolean) => void
}

const day_ms = 86400000
const getTimeStamp = (oldtime: number) => {
    const now = new Date().getTime()
    const delta = now - oldtime
    if (delta < now % day_ms) return new Date(oldtime).toLocaleTimeString()
    if (delta < (now % day_ms) + day_ms) return 'Yesterday'
    return new Date(oldtime).toLocaleDateString()
}

const UserListing: React.FC<CharacterListingProps> = ({
    user,
    nowLoading,
    setNowLoading,
    setShowModal,
}) => {
    const { userId, setCard } = Characters.useUserCard((state) => ({
        userId: state.id,
        setCard: state.setCard,
    }))

    const handleDeleteCard = async (menuRef: React.MutableRefObject<Menu | null>) => {
        Alert.alert({
            title: 'Delete User',
            description: `Are you sure you want to delete '${user.name}'?\nThis cannot be undone.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete User',
                    onPress: async () => {
                        await Characters.db.mutate.deleteCard(user.id)

                        await Characters.db.query.cardList('user').then(async (list) => {
                            if (list.length === 0) {
                                const defaultName = 'User'
                                const id = await Characters.db.mutate.createCard(
                                    defaultName,
                                    'user'
                                )
                                await setCard(id)
                                return
                            }
                            if (userId && list.some((item) => item.id === userId)) return
                            setCard(list[0].id)
                        })
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const handleCloneCard = (menuRef: React.MutableRefObject<Menu | null>) => {
        Alert.alert({
            title: `Clone User`,
            description: `Are you sure you want to clone '${user.name}'?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Clone User',
                    onPress: async () => {
                        menuRef.current?.close()
                        setNowLoading(true)
                        await Characters.db.mutate.duplicateCard(user.id)
                        setNowLoading(false)
                    },
                },
            ],
        })
    }

    return (
        <View
            style={
                user.id === userId ? styles.longButtonSelectedContainer : styles.longButtonContainer
            }>
            <TouchableOpacity
                style={styles.longButton}
                disabled={nowLoading}
                onPress={async () => {
                    setNowLoading(true)
                    await setCard(user.id)
                    setShowModal(false)
                    setNowLoading(false)
                }}>
                <Avatar targetImage={Characters.getImageDir(user.image_id)} style={styles.avatar} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.nametag}>{user.name}</Text>
                        <Text style={styles.timestamp}>
                            {user.last_modified && getTimeStamp(user.last_modified)}
                        </Text>
                    </View>
                </View>
                <PopupMenu
                    disabled={false}
                    icon="edit"
                    options={[
                        {
                            label: 'Clone',
                            icon: 'copy1',
                            onPress: handleCloneCard,
                        },
                        {
                            label: 'Delete',
                            icon: 'delete',
                            warning: true,
                            onPress: handleDeleteCard,
                        },
                    ]}
                />
            </TouchableOpacity>
        </View>
    )
}

export default UserListing

const styles = StyleSheet.create({
    longButton: {
        flexDirection: 'row',
        flex: 1,
        padding: 8,
    },

    longButtonContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-surface1'),
        borderWidth: 2,
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 8,
        flex: 1,
    },

    longButtonSelectedContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 8,
        flex: 1,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        margin: 4,
        backgroundColor: Style.getColor('primary-surface2'),
        borderWidth: 1,
        borderColor: Style.getColor('primary-surface4'),
    },

    nametag: {
        fontSize: 16,
        fontWeight: '500',
        color: Style.getColor('primary-text1'),
    },

    timestamp: {
        fontSize: 12,
        color: Style.getColor('primary-text2'),
    },
})
