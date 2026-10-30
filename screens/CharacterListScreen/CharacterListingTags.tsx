import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

type CharacterListingTagsProps = {
    tags: string[]
    onPress: (tag: string) => void
    showTags: boolean
}

const CharacterListingTags: React.FC<CharacterListingTagsProps> = ({ tags, onPress, showTags }) => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()

    if (!showTags || tags.length === 0) return

    return (
        <View
            style={{
                flexDirection: 'row',

                paddingLeft: 72,
                paddingRight: 16,
                alignItems: 'center',
            }}>
            <View
                style={{
                    flex: 1,
                    columnGap: 4,
                    rowGap: 4,
                    flexDirection: 'row',
                    overflow: 'hidden',
                    flexWrap: 'wrap',
                }}>
                {tags.map((tag, index) => (
                    <TouchableOpacity key={index} onPress={() => onPress(tag)}>
                        <Text
                            style={{
                                color: color.text._200,
                                fontSize: fontSize.m,
                                borderWidth: 1,
                                borderColor: color.primary._200,
                                backgroundColor: color.primary._100,
                                paddingHorizontal: spacing.l,
                                paddingVertical: spacing.s,
                                borderRadius: borderRadius.xl,
                            }}>
                            {tag}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )
}

export default CharacterListingTags
