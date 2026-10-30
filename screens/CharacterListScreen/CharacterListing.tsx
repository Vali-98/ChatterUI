import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import Avatar from '@components/views/Avatar'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Characters, CharacterCardSummary } from '@lib/state/characters'
import { useCharacterSortStore } from '@lib/state/characters/sortStore'
import { Theme } from '@lib/theme/ThemeManager'
import { getFriendlyTimeStamp } from '@lib/utils/Time'

import CharacterActionsMenu from './CharacterActionsMenu'
import CharacterListingTags from './CharacterListingTags'

type CharacterListingProps = {
    character: CharacterCardSummary
    navigationPending: RefObject<boolean>
}

const CharacterListing: React.FC<CharacterListingProps> = ({ character, navigationPending }) => {
    const { t } = useTranslation()
    const [showTags] = useMMKVBoolean(AppSettings.ShowTags)
    const { setShowSearch, setTagFilter, tagFilter } = useCharacterSortStore(
        useShallow((state) => ({
            setShowSearch: state.setShowSearch,
            setTagFilter: state.setTagFilter,
            tagFilter: state.tagFilter,
        }))
    )
    const styles = useStyles()

    const getPreviewText = () => {
        if (character.latestSwipeText === undefined || !character.latestMessageName)
            return t('character.list.emptyStates.noMessages')
        return character.latestMessageName + ':  ' + character.latestSwipeText.trim()
    }

    return (
        <View>
            <CharacterActionsMenu character={character} navigationPending={navigationPending}>
                <View style={styles.longButtonContainer}>
                    <Avatar
                        targetImage={Characters.getCardImageUri(character.image_id)}
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
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.previewText}>
                            {getPreviewText()}
                        </Text>
                    </View>
                </View>
            </CharacterActionsMenu>
            <CharacterListingTags
                tags={character.tags}
                showTags={showTags!}
                onPress={(tag: string) => {
                    setShowSearch(true)
                    if (tagFilter.includes(tag)) return
                    setTagFilter([...tagFilter, tag])
                }}
            />
        </View>
    )
}

export default CharacterListing

const useStyles = () => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        longButtonContainer: {
            flexDirection: 'row',
            backgroundColor: color.neutral._100,
            borderRadius: borderRadius.m,
            flex: 1,
            paddingVertical: spacing.l,
            paddingHorizontal: spacing.xl,
        },

        avatar: {
            width: 48,
            height: 48,
            borderRadius: borderRadius.l,
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
    })
}
