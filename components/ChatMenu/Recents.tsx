import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native'
import { useState } from 'react'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'
import { Characters, Chats, Global, Logger, Style } from '@globals'
import { RecentEntry, RecentMessages } from '@constants/RecentMessages'
import { AntDesign, FontAwesome } from '@expo/vector-icons'

const Recents = () => {
    const [recentMessages, setRecentMessages] = useMMKVObject<Array<RecentEntry>>(
        Global.RecentMessages
    )
    const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [nowLoading, setNowLoading] = useState<boolean>(false)
    const { loadChat } = Chats.useChat((state) => ({ loadChat: state.load }))
    const handleLoadEntry = async (entry: RecentEntry) => {
        if (nowLoading) return
        setNowLoading(true)
        if (
            !(await Characters.exists(entry.charName)) ||
            !(await Chats.exists(entry.charName, entry.chatName))
        ) {
            Logger.log('Character or Chat no longer exists', true)
            RecentMessages.deleteEntry(entry.chatName)
            setNowLoading(false)
            return
        }

        await Characters.getCard(entry.charName).then((data) => {
            if (data) setCurrentCard(JSON.parse(data))
        })

        await loadChat(entry.charName, entry.chatName)
        setCharName(entry.charName)
        setNowLoading(false)
    }
    const noRecents = !recentMessages || (recentMessages.length === 0 && !nowLoading)
    const showRecents = !nowLoading && recentMessages && recentMessages.length > 0
    if (recentMessages && recentMessages?.length !== 0)
        return (
            <ScrollView style={styles.mainContainer}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Recent</Text>
                    {!noRecents && (
                        <TouchableOpacity style={styles.button} onPress={RecentMessages.flush}>
                            <FontAwesome
                                size={20}
                                name="trash"
                                color={Style.getColor('primary-text1')}
                            />
                        </TouchableOpacity>
                    )}
                </View>
                {nowLoading && (
                    <ActivityIndicator
                        color={Style.getColor('primary-text2')}
                        size={'large'}
                        style={{ marginRight: 24 }}
                    />
                )}
                {showRecents &&
                    [...recentMessages].reverse()?.map((item, index) => (
                        <View key={index} style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                style={styles.longButton}
                                onPress={() => {
                                    handleLoadEntry(item)
                                }}>
                                <View style={styles.textContainer}>
                                    <Text style={styles.longButtonTitle}>{item.charName}</Text>
                                    <Text style={styles.longButtonBody}>{item.chatName}</Text>
                                </View>
                                <TouchableOpacity
                                    style={{ marginTop: 8 }}
                                    onPress={() => RecentMessages.deleteEntry(item.chatName)}>
                                    <FontAwesome
                                        color={Style.getColor('primary-text2')}
                                        name="close"
                                        size={28}
                                    />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>
                    ))}
                {noRecents && <Text style={styles.subtitle}>No Recent Messages</Text>}
            </ScrollView>
        )
}

const styles = StyleSheet.create({
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },

    titleContainer: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 20,
    },

    title: {
        color: Style.getColor('primary-text1'),
        fontSize: 20,
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
        fontSize: 18,
    },

    button: {
        padding: 8,
        borderColor: Style.getColor('primary-surface3'),
        borderWidth: 2,
        borderRadius: 4,
        marginLeft: 12,
    },

    longButton: {
        flex: 1,
        backgroundColor: Style.getColor('primary-surface3'),
        flexDirection: 'row',
        paddingHorizontal: 12,
        borderRadius: 8,
        marginVertical: 4,
        justifyContent: 'space-between',
        shadowColor: Style.getColor('primary-shadow'),
        elevation: 12,
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
