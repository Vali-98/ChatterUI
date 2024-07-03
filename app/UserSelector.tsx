import AnimatedView from '@components/AnimatedView'
import TextBoxModal from '@components/TextBoxModal'
import { FontAwesome } from '@expo/vector-icons'
import { Characters, Logger, Style } from '@globals'
import { Stack, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
} from 'react-native'

type CardInfo = {
    name: string
    id: number
    image_id: number
}

const UserSelector = () => {
    const router = useRouter()

    const { userID, setCard, getImage } = Characters.useUserCard((state) => ({
        userID: state.id,
        setCard: state.setCard,
        getImage: state.getImage,
    }))

    const [userList, setUserList] = useState<CardInfo[]>([])
    const [showNewUser, setShowNewUser] = useState<boolean>(false)

    const loadUserList = () => {
        Characters.db.query
            .cardList('user')
            .then(async (list: CardInfo[]) => {
                if (list.length === 0) {
                    const defaultName = 'User'
                    const id = await Characters.db.mutate.createCard(defaultName, 'user')
                    await setCard(id)
                    loadUserList()
                    return
                }
                setUserList(list)
                if (userID && list.some((item) => item.id === userID)) return
                setCard(list[0].id)
            })
            .catch(() => setUserList([]))
    }

    useEffect(() => {
        if (userID !== undefined) loadUserList()
    }, [])

    return (
        <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
            <SafeAreaView style={styles.mainContainer}>
                <Stack.Screen
                    options={{
                        title: 'Personas',
                        animation: 'fade',
                        headerRight: () => {
                            return (
                                <View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setShowNewUser(true)
                                        }}>
                                        <FontAwesome
                                            size={28}
                                            name="plus"
                                            color={Style.getColor('primary-text1')}
                                        />
                                    </TouchableOpacity>
                                </View>
                            )
                        },
                    }}
                />

                <ScrollView>
                    {userList.map((info, index) => (
                        <View
                            key={index}
                            style={
                                info.id === userID
                                    ? styles.longButtonSelectedContainer
                                    : styles.longButtonContainer
                            }>
                            <TouchableOpacity
                                style={styles.useritembutton}
                                onPress={async () => {
                                    setCard(info.id)
                                    router.back()
                                }}>
                                <Image
                                    source={{ uri: Characters.getImageDir(info.image_id) }}
                                    style={styles.avatar}
                                />

                                <Text style={styles.username}>{info.name}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => {
                                    Alert.alert(
                                        `Delete Persona`,
                                        `Are you sure you want to delete '${info.name}'?`,
                                        [
                                            { text: `Cancel`, style: `cancel` },
                                            {
                                                text: `Confirm`,
                                                style: `destructive`,
                                                onPress: async () => {
                                                    await Characters.db.mutate.deleteCard(info.id)
                                                    loadUserList()
                                                },
                                            },
                                        ]
                                    )
                                }}>
                                <FontAwesome
                                    size={28}
                                    name="trash"
                                    color={Style.getColor('primary-text1')}
                                />
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>

                <TextBoxModal
                    booleans={[showNewUser, setShowNewUser]}
                    onConfirm={async (text) => {
                        const id = await Characters.db.mutate.createCard(text, 'user')
                        await setCard(id)
                        loadUserList()
                    }}
                />
            </SafeAreaView>
        </AnimatedView>
    )
}

export default UserSelector

const styles = StyleSheet.create({
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 8,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        margin: 4,
        backgroundColor: Style.getColor('primary-surface2'),
    },

    username: {
        marginLeft: 12,
        fontSize: 16,
        flex: 1,
        color: Style.getColor('primary-text1'),
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
        paddingVertical: 8,
        padding: 8,
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

    secondaryButton: {
        paddingHorizontal: 12,
        paddingVertical: 22,
    },

    useritembutton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
})
