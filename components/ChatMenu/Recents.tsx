import AnimatedView from '@components/AnimatedView'
import { RecentEntry, RecentMessages } from '@constants/RecentMessages'
import { FontAwesome, Ionicons } from '@expo/vector-icons'
import { Characters, Chats, Global, Logger, Style } from '@globals'
import { useState } from 'react'
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native'
import { useMMKVObject } from 'react-native-mmkv'

const Recents = () => {
    const [recentMessages, setRecentMessages] = useMMKVObject<RecentEntry[]>(Global.RecentMessages)

    const setCurrentCard = Characters.useCharacterCard((state) => state.setCard)

    const [nowLoading, setNowLoading] = useState<boolean>(false)
    const { loadChat } = Chats.useChat((state) => ({ loadChat: state.load }))
    const handleLoadEntry = async (entry: RecentEntry) => {
        if (nowLoading) return
        setNowLoading(true)
        if (
            !(await Characters.db.query.cardExists(entry.charId)) ||
            !(await Chats.db.query.chatExists(entry.chatId))
        ) {
            Logger.log('Character or Chat no longer exists', true)
            RecentMessages.deleteEntry(entry.chatId)
            setNowLoading(false)
            return
        }
        await setCurrentCard(entry.charId)
        await loadChat(entry.chatId)
        setNowLoading(false)
    }
    const noRecents = !recentMessages || (recentMessages.length === 0 && !nowLoading)
    const showRecents = !nowLoading && recentMessages && recentMessages.length > 0
    if (recentMessages && recentMessages?.length !== 0)
        return (
            <AnimatedView style={{ flex: 1 }} dy={100} tduration={200} fade={0} fduration={100}>
                <ScrollView style={styles.mainContainer}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Recent</Text>
                        {!noRecents && (
                            <TouchableOpacity style={styles.button} onPress={RecentMessages.flush}>
                                <Text
                                    style={{
                                        color: Style.getColor('primary-text2'),
                                        fontSize: 16,
                                    }}>
                                    Clear All
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {nowLoading && (
                        <ActivityIndicator
                            color={Style.getColor('primary-text2')}
                            size="large"
                            style={{ marginRight: 24 }}
                        />
                    )}
                    {showRecents &&
                        [...recentMessages].reverse()?.map((item, index) => (
                            <View
                                key={index}
                                style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity
                                    style={styles.longButton}
                                    onPress={async () => {
                                        handleLoadEntry(item)
                                    }}>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.longButtonTitle}>{item.charName}</Text>
                                        <Text style={styles.longButtonBody}>
                                            {item.lastModified}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => RecentMessages.deleteEntry(item.chatId)}>
                                    <FontAwesome
                                        color={Style.getColor('primary-text2')}
                                        name="trash"
                                        size={28}
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}
                    {noRecents && <Text style={styles.subtitle}>No Recent Messages</Text>}
                </ScrollView>
            </AnimatedView>
        )

    return (
        <AnimatedView
            style={{ flex: 1, marginHorizontal: 30, marginTop: 60, alignItems: 'center' }}
            dy={100}
            tduration={200}
            fade={0}
            fduration={100}>
            <Text style={styles.welcometext}>
                Select A Character{' '}
                <Ionicons size={14} color={Style.getColor('primary-text1')} name="person" /> To Get
                Started!
            </Text>
            <Text style={{ color: Style.getColor('primary-text2'), marginTop: 8 }}>
                You can also swipe right to go to characters
            </Text>
        </AnimatedView>
    )
}

const styles = StyleSheet.create({
    welcometext: {
        justifyContent: 'center',
        fontSize: 20,
        color: Style.getColor('primary-text1'),
    },

    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },

    titleContainer: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },

    title: {
        color: Style.getColor('primary-text1'),
        fontSize: 20,
        marginLeft: 8,
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
        fontSize: 18,
    },

    button: {
        padding: 4,
        paddingHorizontal: 8,
        //borderColor: Style.getColor('primary-surface3'),
        //borderWidth: 2,
        borderRadius: 4,
        marginLeft: 12,
    },

    secondaryButton: {
        paddingHorizontal: 16,
        paddingVertical: 18,
    },

    longButton: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        marginVertical: 4,
        justifyContent: 'space-between',
        shadowColor: Style.getColor('primary-shadow'),
        elevation: 12,
        marginLeft: 12,
    },

    textContainer: {
        paddingVertical: 12,
    },

    longButtonTitle: {
        color: Style.getColor('primary-text1'),
        fontSize: 16,
    },

    longButtonBody: {
        color: Style.getColor('primary-text2'),
    },
})

export default Recents
