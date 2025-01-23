import Avatar from '@components/views/Avatar'
import { CharInfo } from '@lib/storage/Characters'
import { Characters, Chats, Logger, Style } from '@lib/utils/Global'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'

import CharacterEditPopup from './CharacterEditPopup'

type CharacterListingProps = {
    index: number
    character: CharInfo
    nowLoading: boolean
    showTags: boolean
    setNowLoading: (b: boolean) => void
}

const day_ms = 86400000
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

    const { loadChat } = Chats.useChat()

    const setCurrentCharacter = async (charId: number) => {
        if (nowLoading) return
        try {
            setNowLoading(true)
            await setCurrentCard(charId)
            let chatId = character.latestChat
            if (!chatId) {
                chatId = await Chats.db.mutate.createChat(charId)
            }
            if (!chatId) {
                Logger.log('Chat creation backup has failed! Please report.', true)
                return
            }
            await loadChat(chatId)
            setNowLoading(false)
        } catch (error) {
            Logger.log(`Couldn't load character: ${error}`, true)
            setNowLoading(false)
        }
    }

    const getPreviewText = () => {
        if (!character.latestSwipe || !character.latestName) return '(No Chat Data)'
        return character.latestName + ':  ' + character.latestSwipe
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
                <Avatar
                    targetImage={Characters.getImageDir(character.image_id)}
                    style={styles.avatar}
                />

                <View style={{ flex: 1, paddingLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.nametag} numberOfLines={2}>
                            {character.name}
                        </Text>
                        <Text style={styles.timestamp}>
                            {getTimeStamp(character.last_modified)}
                        </Text>
                    </View>
                    {character.latestSwipe && (
                        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.previewText}>
                            {getPreviewText()}
                        </Text>
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
                        {showTags &&
                            character.tags.map((item, index) => (
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
                    <CharacterEditPopup
                        characterInfo={character}
                        setNowLoading={setNowLoading}
                        nowLoading={nowLoading}
                    />
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

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        margin: 4,
        backgroundColor: Style.getColor('primary-surface2'),
    },

    nametag: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: Style.getColor('primary-text1'),
    },

    timestamp: {
        fontSize: 12,
        color: Style.getColor('primary-text2'),
    },

    previewText: {
        marginTop: 4,
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
