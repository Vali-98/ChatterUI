import Alert from '@components/views/Alert'
import Avatar from '@components/views/Avatar'
import ContextMenu from '@components/views/ContextMenu'
import Drawer from '@components/views/Drawer'
import { Characters } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

type CharacterData = Awaited<ReturnType<typeof Characters.db.query.cardListQuery>>[0]

type CharacterListingProps = {
    user: CharacterData
}

const day_ms = 86400000
const getTimeStamp = (oldtime: number) => {
    const now = Date.now()
    const delta = now - oldtime
    if (delta < now % day_ms) return new Date(oldtime).toLocaleTimeString()
    if (delta < (now % day_ms) + day_ms) return 'Yesterday'
    return new Date(oldtime).toLocaleDateString()
}

const UserListing: React.FC<CharacterListingProps> = ({ user }) => {
    const styles = useStyles()
    const { spacing } = Theme.useTheme()
    const setShow = Drawer.useDrawerStore((state) => state.setShow)

    const setShowDrawer = (b: boolean) => {
        setShow(Drawer.ID.USERLIST, b)
    }

    const { userId, setCard } = Characters.useUserStore(
        useShallow((state) => ({
            userId: state.id,
            setCard: state.setCard,
        }))
    )

    const handleDeleteCard = async (close: () => void) => {
        close()
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

    const handleCloneCard = (close: () => void) => {
        Alert.alert({
            title: `Clone User`,
            description: `Are you sure you want to clone '${user.name}'?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Clone User',
                    onPress: async () => {
                        close()
                        await Characters.db.mutate.duplicateCard(user.id)
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
                onPress={async () => {
                    await setCard(user.id)
                    setShowDrawer(false)
                }}>
                <View
                    style={{
                        flexDirection: 'row',
                        flex: 1,
                    }}>
                    <Avatar
                        targetImage={Characters.getImageDir(user.image_id)}
                        style={styles.avatar}
                    />
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.nametag}>{user.name}</Text>
                            <Text style={styles.timestamp}>
                                {user.last_modified && getTimeStamp(user.last_modified)}
                            </Text>
                        </View>
                    </View>
                </View>

                <ContextMenu
                    triggerStyle={{ paddingHorizontal: spacing.m }}
                    disabled={false}
                    placement="left"
                    triggerIcon="edit"
                    buttons={[
                        {
                            label: 'Clone',
                            icon: 'copy1',
                            onPress: handleCloneCard,
                        },
                        {
                            label: 'Delete',
                            icon: 'delete',
                            variant: 'warning',
                            onPress: handleDeleteCard,
                        },
                    ]}
                />
            </TouchableOpacity>
        </View>
    )
}

export default UserListing

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        longButton: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            padding: spacing.m,
        },

        longButtonContainer: {
            borderColor: color.neutral._100,
            borderWidth: borderWidth.m,
            flexDirection: 'row',
            marginBottom: spacing.m,
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: spacing.m,
            flex: 1,
        },

        longButtonSelectedContainer: {
            borderColor: color.primary._500,
            borderWidth: borderWidth.m,
            flexDirection: 'row',
            marginBottom: spacing.m,
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: spacing.m,
            flex: 1,
        },

        avatar: {
            width: 48,
            height: 48,
            borderRadius: borderRadius.l,
            margin: spacing.sm,
            backgroundColor: color.neutral._100,
            borderWidth: borderWidth.s,
            borderColor: color.primary._300,
        },

        nametag: {
            fontSize: fontSize.l,
            fontWeight: '500',
            color: color.text._200,
        },

        timestamp: {
            fontSize: fontSize.s,
            color: color.text._400,
        },
    })
}
