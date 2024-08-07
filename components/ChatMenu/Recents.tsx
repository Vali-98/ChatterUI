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
import { Characters, Chats, Color, Global, Logger } from '@globals'
import { RecentEntry, RecentMessages } from '@constants/RecentMessages'
import { FontAwesome } from '@expo/vector-icons'

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

    return (
        <ScrollView style={styles.mainContainer}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Recent</Text>
                {!noRecents && (
                    <TouchableOpacity style={styles.button} onPress={RecentMessages.flush}>
                        <FontAwesome size={20} name="trash" color={Color.Button} />
                    </TouchableOpacity>
                )}
            </View>
            {nowLoading && (
                <ActivityIndicator
                    color={Color.Offwhite}
                    size={'large'}
                    style={{ marginRight: 24 }}
                />
            )}
            {showRecents &&
                [...recentMessages].reverse()?.map((item, index) => (
                    <View key={index} style={{ flexDirection: 'row' }}>
                        <TouchableOpacity
                            style={{ ...styles.longButton, flex: 1, marginRight: 8 }}
                            onPress={() => {
                                handleLoadEntry(item)
                            }}>
                            <View>
                                <Text style={styles.longButtonTitle}>{item.charName}</Text>
                                <Text style={styles.longButtonBody}>{item.chatName}</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.longButton}
                            onPress={() => RecentMessages.deleteEntry(item.chatName)}>
                            <FontAwesome color={Color.Button} name="close" size={28} />
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
        backgroundColor: Color.Background,
    },

    titleContainer: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 20,
    },

    title: {
        color: Color.TextWhite,
        fontSize: 20,
    },

    subtitle: {
        color: Color.Offwhite,
        fontSize: 18,
    },

    button: {
        padding: 8,
        backgroundColor: Color.DarkContainer,
        borderRadius: 4,
        marginLeft: 12,
    },

    longButton: {
        backgroundColor: Color.DarkContainer,
        flexDirection: 'row',
        padding: 12,
        borderRadius: 8,
        marginVertical: 4,
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    longButtonTitle: {
        color: Color.White,
    },

    longButtonBody: {
        color: Color.Offwhite,
    },
})

export default Recents
