import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Pressable, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import ThemedButton from '@components/buttons/ThemedButton'
import BottomSheet, { BottomSheetRef } from '@components/views/BottomSheet'
import useAnimatedActiveColorStyle from '@lib/hooks/AnimatedActiveColorStyle'
import { Theme } from '@lib/theme/ThemeManager'

type ListSheetProps<T> = {
    ref: BottomSheetRef
    items: T[]
    title?: string
    labelExtractor: (data: T) => string
    keyExtractor: (data: T) => string
    selectLabel?: string
    onSelect: (data: T | undefined, ref: BottomSheetRef) => void
    initialIndex?: number
}

const ListSheetItem: React.FC<{
    onPress: () => void
    selected: boolean
    label: string
}> = ({ onPress, selected, label }) => {
    const { color, borderWidth, spacing, fontSize } = Theme.useTheme()

    const animatedStyle = useAnimatedActiveColorStyle({
        deactiveColor: color.neutral._200,
        activeColor: color.primary._500,
        active: selected,
    })

    return (
        <Animated.View
            style={[
                {
                    borderWidth: borderWidth.m,
                    borderRadius: spacing.xl,
                },
                animatedStyle,
            ]}>
            <Pressable
                style={{
                    minHeight: 48,
                    paddingLeft: spacing.xl,
                    paddingRight: spacing.xl,
                    paddingVertical: spacing.m,
                    alignItems: 'center',
                    flexDirection: 'row',
                    columnGap: 12,
                    flex: 1,
                }}
                onPress={onPress}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: color.text._100, fontSize: fontSize.l }}>{label}</Text>
                </View>
            </Pressable>
        </Animated.View>
    )
}

const ListSheet = <T,>({
    ref,
    items,
    title,
    labelExtractor,
    keyExtractor,
    selectLabel,
    initialIndex,
    onSelect,
}: ListSheetProps<T>) => {
    const [selected, setSelected] = useState<number | undefined>(initialIndex)
    const { color, fontSize, spacing } = Theme.useTheme()
    const { t } = useTranslation()
    selectLabel = selectLabel ?? t('common.actions.select')
    title = title ?? t('common.actions.select')
    return (
        <BottomSheet
            ref={ref}
            onClose={() => setSelected(undefined)}
            sheetStyle={{ maxHeight: '80%' }}>
            <Text
                style={{
                    color: color.text._100,
                    paddingBottom: spacing.xl,
                    fontSize: fontSize.xl,
                }}>
                {title}
            </Text>
            <FlatList
                data={items}
                keyExtractor={keyExtractor}
                renderItem={({ item, index }) => (
                    <ListSheetItem
                        label={labelExtractor(item)}
                        selected={selected === index}
                        onPress={() => {
                            setSelected(selected === index ? undefined : index)
                        }}
                    />
                )}
                contentContainerStyle={{
                    rowGap: 8,
                    paddingBottom: 32,
                }}
                showsVerticalScrollIndicator={false}
            />

            <View style={{ paddingTop: 12 }}>
                <ThemedButton
                    disabled={selected === undefined}
                    label={selectLabel}
                    variant={selected === undefined ? 'disabled' : 'secondary'}
                    onPress={() => {
                        if (selected !== undefined) onSelect(items[selected], ref)
                    }}
                />
            </View>
        </BottomSheet>
    )
}

export default ListSheet
