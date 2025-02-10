import Avatar from '@components/views/Avatar'
import { Characters, CharInfo } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

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
    const { color } = Theme.useTheme()
    const styles = useStyles()

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
        <View style={styles.longButtonContainer}>
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
                        color={color.text._100}
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

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        longButton: {
            flexDirection: 'row',
            flex: 1,
            padding: spacing.l,
        },

        longButtonContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: borderRadius.m,
            flex: 1,
        },

        avatar: {
            width: 48,
            height: 48,
            borderRadius: borderRadius.l,
            margin: spacing.sm,
            backgroundColor: color.neutral._200,
            borderColor: color.neutral._200,
            borderWidth: 1,
        },

        nametag: {
            flex: 1,
            fontSize: fontSize.l,
            fontWeight: '500',
            color: color.text._100,
        },

        timestamp: {
            fontSize: fontSize.s,
            color: color.text._400,
        },

        previewText: {
            marginTop: spacing.s,
            color: color.text._500,
        },

        tag: {
            color: color.text._400,
            fontSize: fontSize.s,
            backgroundColor: color.primary._300,
            paddingHorizontal: spacing.s,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.s,
            rowGap: 2,
            columnGap: 4,
        },
    })
}
