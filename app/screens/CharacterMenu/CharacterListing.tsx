import Avatar from '@components/views/Avatar'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Characters, CharInfo } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { getFriendlyTimeStamp } from '@lib/utils/Time'
import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import CharacterEditPopup from './CharacterEditPopup'
import { useCharacterListSorter } from './CharacterListHeader'

type CharacterListingProps = {
    index: number
    character: CharInfo
    nowLoading: boolean
    setNowLoading: (b: boolean) => void
}

const CharacterListing: React.FC<CharacterListingProps> = ({
    index,
    character,
    nowLoading,
    setNowLoading,
}) => {
    const router = useRouter()
    const [showTags, _] = useMMKVBoolean(AppSettings.ShowTags)
    const { setShowSearch, setTagFilter, tagFilter } = useCharacterListSorter((state) => ({
        setShowSearch: state.setShowSearch,
        setTagFilter: state.setTagFilter,
        tagFilter: state.tagFilter,
    }))
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
                Logger.errorToast('Chat creation backup has failed! Please report.')
                return
            }
            await loadChat(chatId)
            setNowLoading(false)
            router.push('/screens/ChatMenu')
        } catch (error) {
            Logger.errorToast(`Couldn't load character: ${error}`)
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
                            {getFriendlyTimeStamp(character.last_modified)}
                        </Text>
                    </View>
                    {character.latestSwipe && (
                        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.previewText}>
                            {getPreviewText()}
                        </Text>
                    )}
                    <View
                        style={{
                            marginTop: 8,
                            flex: 1,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            columnGap: 4,
                            rowGap: 4,
                        }}>
                        {showTags &&
                            character.tags.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        setShowSearch(true)
                                        if (tagFilter.includes(item)) return
                                        setTagFilter([...tagFilter, item])
                                    }}>
                                    <Text style={styles.tag}>{item}</Text>
                                </TouchableOpacity>
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
            color: color.text._200,
            fontSize: fontSize.m,
            borderWidth: 1,
            borderColor: color.primary._200,
            backgroundColor: color.primary._100,
            paddingHorizontal: spacing.l,
            paddingVertical: spacing.s,
            borderRadius: borderRadius.xl,
        },
    })
}
