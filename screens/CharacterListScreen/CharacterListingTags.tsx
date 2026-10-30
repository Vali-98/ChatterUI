import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, View } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'
import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'

type CharacterListingTagsProps = {
    tags: string[]
    onPress: (tag: string) => void
    showTags: boolean
    previewNumber?: number
}

const CharacterListingTags: React.FC<CharacterListingTagsProps> = ({
    tags,
    onPress,
    showTags,
    previewNumber = 3,
}) => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()
    const { t } = useTranslation()
    const [expanded, setExpanded] = useState(false)
    const limit = Math.max(0, Math.floor(previewNumber))
    const canExpand = tags.length > limit + 1
    const visibleTags = expanded || !canExpand ? tags : tags.slice(0, limit)
    const hiddenCount = tags.length - visibleTags.length

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
                    flexWrap: 'wrap',
                }}>
                {visibleTags.map((tag, index) => (
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
                {hiddenCount > 0 && (
                    <ThemedButton
                        label={`+${hiddenCount}`}
                        variant="secondary"
                        level="muted"
                        viewStyle={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 16 }}
                        onPress={() => setExpanded(true)}
                    />
                )}
                {expanded && canExpand && (
                    <IconButton
                        iconName="left"
                        variant="secondary"
                        iconSize={16}
                        viewStyle={{ paddingHorizontal: 8, borderRadius: 16 }}
                        level="muted"
                        accessibilityLabel={t('common.actions.collapse')}
                        onPress={() => setExpanded(false)}
                    />
                )}
            </View>
        </View>
    )
}

export default CharacterListingTags
