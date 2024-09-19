import { AntDesign } from '@expo/vector-icons'
import { Characters, Chats, Logger, Style } from '@globals'
import { router } from 'expo-router'
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'

type CharacterListingProps = {
    index: number
    character: CharInfo
    nowLoading: boolean
    showTags: boolean
    setNowLoading: (b: boolean) => void
}

type CharInfo = {
    name: string
    id: number
    image_id: number
    last_modified: number
    tags: string[]
    latestSwipe?: string
    latestName?: string
    latestChat?: number
}

const day_ms = 86400000
const day2_ms = 172800000
const getTimeStamp = (oldtime: number) => {
    const now = new Date().getTime()
    const delta = now - oldtime
    if (delta < now % day_ms) return new Date(oldtime).toLocaleTimeString()
    if (delta < (now % day_ms) + day_ms) return 'Yesterday'
    return new Date(oldtime).toLocaleDateString()
}

const CharacterListing: React.FC<CharacterListingProps> = ({
    index,
    character,
    nowLoading,
    showTags,
    setNowLoading,
}) => {
    const { loadedCharId, setCurrentCard } = Characters.useCharacterCard((state) => ({
        loadedCharId: state.id,
        setCurrentCard: state.setCard,
    }))

    const loadChat = Chats.useChat((state) => state.load)

    const setCurrentCharacter = async (charId: number, edit: boolean = false) => {
        if (nowLoading) return

        try {
            setNowLoading(true)
            await setCurrentCard(charId)

            if (edit) {
                router.push('/CharInfo')
            } else {
                let chatId = character.latestChat
                if (!chatId) {
                    chatId = await Chats.db.mutate.createChat(charId)
                }
                if (!chatId) {
                    Logger.log('Chat creation backup has failed! Please report.', true)
                    return
                }
                await loadChat(chatId)
            }

            setNowLoading(false)
        } catch (error) {
            Logger.log(`Couldn't load character: ${error}`, true)
            setNowLoading(false)
        }
    }

    const getPreviewText = () => {
        if (!character.latestSwipe || !character.latestName) return ''
        const previewText =
            (character.latestName + ':  ' + character.latestSwipe).substring(0, 80) +
            (character.latestSwipe.length > 80 ? '...' : '')
        return previewText
    }

    return (
        <View
            style={
                character.id === loadedCharId
                    ? styles.longButtonSelectedContainer
                    : styles.longButtonContainer
            }>
            <TouchableOpacity
                style={styles.longButton}
                disabled={nowLoading}
                onPress={() => setCurrentCharacter(character.id)}>
                <Image
                    source={{
                        uri: Characters.getImageDir(character.image_id),
                    }}
                    style={styles.avatar}
                />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.nametag}>{character.name}</Text>
                        <Text style={styles.timestamp}>
                            {' '}
                            {getTimeStamp(character.last_modified)}
                        </Text>
                    </View>
                    {character.latestSwipe && (
                        <Text style={styles.previewText}>{getPreviewText()}</Text>
                    )}
                    <View
                        style={{
                            paddingLeft: 16,
                            flex: 1,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            columnGap: 2,
                            rowGap: 2,
                        }}>
                        {character.tags.map((item, index) => (
                            <Text style={styles.tag} key={index}>
                                {item}
                            </Text>
                        ))}
                    </View>
                </View>
            </TouchableOpacity>
            <View>
                {nowLoading && character.id === loadedCharId ? (
                    <ActivityIndicator
                        color={Style.getColor('primary-text2')}
                        style={{ paddingLeft: 8 }}
                        size={28}
                    />
                ) : (
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={async () => {
                            setCurrentCharacter(character.id, true)
                        }}
                        disabled={nowLoading}>
                        <AntDesign color={Style.getColor('primary-text2')} name="edit" size={26} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}

export default CharacterListing

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

    secondaryButton: {
        paddingHorizontal: 12,
        paddingVertical: 20,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        margin: 4,
        backgroundColor: Style.getColor('primary-surface2'),
    },

    nametag: {
        fontSize: 16,
        color: Style.getColor('primary-text1'),
    },

    timestamp: {
        fontSize: 12,
        color: Style.getColor('primary-text2'),
    },

    previewText: {
        marginTop: 4,
        fontSize: 12,
        color: Style.getColor('primary-text3'),
    },

    tag: {
        color: Style.getColor('primary-text2'),
        fontSize: 12,
        backgroundColor: Style.getColor('primary-surface4'),
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        rowGap: 2,
        columnGap: 4,
    },
})
