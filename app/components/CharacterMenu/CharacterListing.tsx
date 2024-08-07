import AnimatedView from '@components/AnimatedView'
import { AntDesign } from '@expo/vector-icons'
import { Characters, Chats, Logger, Style } from '@globals'
import { router } from 'expo-router'
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'

type CharacterListingProps = {
    index: number
    character: CharInfo
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

type CharInfo = {
    name: string
    id: number
    image_id: number
    tags: string[]
}

const CharacterListing: React.FC<CharacterListingProps> = ({
    index,
    character,
    nowLoading,
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
            await setCurrentCard(charId)
            setNowLoading(true)
            const returnedChatId = await Chats.db.query.chatNewest(charId)
            let chatId = returnedChatId
            if (!chatId) {
                chatId = await Chats.db.mutate.createChat(charId)
            }
            if (!chatId) {
                Logger.log('Chat creation backup has failed! Please report.', true)
                return
            }

            await loadChat(chatId)

            setNowLoading(false)
            if (edit) router.push('/CharInfo')
            else router.back()
        } catch (error) {
            Logger.log(`Couldn't load character: ${error}`, true)
            setNowLoading(false)
        }
    }

    return (
        <AnimatedView
            style={
                character.id === loadedCharId
                    ? styles.longButtonSelectedContainer
                    : styles.longButtonContainer
            }
            dx={Math.min(500 + index * 200, 2000)}
            tduration={Math.min(500 + index * 100, 1000)}
            fade={0}
            fduration={500}>
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
                <View>
                    <Text style={styles.nametag}>{character.name}</Text>
                    <View
                        style={{
                            paddingLeft: 16,
                            flex: 1,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
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
                        <AntDesign
                            color={Style.getColor('primary-text2')}
                            name="idcard"
                            size={32}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </AnimatedView>
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
        marginLeft: 20,
        color: Style.getColor('primary-text1'),
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
