import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Linking, Pressable, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import Aicons, { AiconsGlyphName } from '@components/icons/Aicons'
import BottomSheet, { BottomSheetRef } from '@components/views/BottomSheet'
import { APIConfiguration } from '@lib/engine/API/APIBuilder.types'
import { APIManager } from '@lib/engine/API/APIManagerState'
import useAnimatedActiveColorStyle from '@lib/hooks/AnimatedActiveColorStyle'
import { Theme } from '@lib/theme/ThemeManager'

type TemplatePickerProps = {
    ref: BottomSheetRef
    setPending: (index: number) => void
}

const TemplateItem: React.FC<{
    config: APIConfiguration
    onPress: () => void
    selected: boolean
}> = ({ config, onPress, selected }) => {
    const { color, borderWidth, spacing, fontSize } = Theme.useTheme()

    const animatedStyle = useAnimatedActiveColorStyle({
        deactiveColor: color.neutral._200,
        activeColor: color.primary._500,
        active: selected,
    })

    // eslint-disable-next-line i18next/no-literal-string
    const icon = config.ui.display?.icon ?? 'link'
    const name = config.ui.display?.name ?? config.name
    const description = config.ui.display?.description
    const link = config.ui.display?.link

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
                    minHeight: 64,
                    paddingLeft: spacing.xl,
                    paddingRight: spacing.xl,
                    paddingVertical: spacing.m,
                    alignItems: 'center',
                    flexDirection: 'row',
                    columnGap: 12,
                    flex: 1,
                }}
                onPress={onPress}>
                {icon && (
                    <Aicons
                        style={{ minWidth: 32, alignSelf: 'center' }}
                        name={icon as AiconsGlyphName}
                        size={24}
                        color={color.text._400}
                    />
                )}
                <View style={{ flex: 1, marginRight: link ? 0 : 16 }}>
                    <Text style={{ color: color.text._100, fontSize: fontSize.l }}>{name}</Text>
                    {description && <Text style={{ color: color.text._400 }}>{description}</Text>}
                </View>
                {link && (
                    <Pressable onPress={() => Linking.openURL(link)}>
                        <AntDesign name={'info-circle'} color={color.text._400} size={20} />
                    </Pressable>
                )}
            </Pressable>
        </Animated.View>
    )
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({ ref, setPending }) => {
    const { t } = useTranslation()
    const [selected, setSelected] = useState<number | undefined>()
    const { color, fontSize, spacing } = Theme.useTheme()
    const { addValue, getTemplates, valuesLength } = APIManager.useConnectionsStore(
        useShallow((state) => ({
            addValue: state.addValue,
            getTemplates: state.getTemplates,
            valuesLength: state.values.length,
        }))
    )

    const templates = useMemo(
        () =>
            getTemplates().sort(
                (a, b) => (b.ui.display?.priority ?? 0) - (a.ui.display?.priority ?? 0)
            ),
        [getTemplates]
    )

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
                {t('connections.add.title')}
            </Text>
            <FlatList
                data={templates}
                keyExtractor={(item) => item.name}
                renderItem={({ item, index }) => (
                    <TemplateItem
                        config={item}
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
                    label={t('common.actions.create')}
                    onPress={() => {
                        if (!selected) return
                        const template = templates.at(selected)
                        if (!template) return
                        addValue({
                            ...template.defaultValues,
                            active: true,
                            configName: template.name,
                            friendlyName: t('connections.add.defaultFriendlyName'),
                        })
                        setPending(valuesLength)
                        ref.current?.close()
                    }}
                    variant={selected === undefined ? 'disabled' : 'primary'}
                />
            </View>
        </BottomSheet>
    )
}

export default TemplatePicker
