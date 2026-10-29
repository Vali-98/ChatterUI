import AntDesign from '@react-native-vector-icons/ant-design/static'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'

import IconButton from '@components/buttons/IconButton'
import { EdgeFadeScrollView, type EdgeFadeOptions } from '@components/views/EdgeFade'
import { DefaultColorSchemes, type ThemeColor } from '@lib/theme/ThemeColor'
import { Theme } from '@lib/theme/ThemeManager'

const ThemePalettePicker = ({
    themes,
    selected,
    onSelect,
    onRemove,
    edgeLength,
    edgeColour,
}: EdgeFadeOptions & {
    themes: ThemeColor[]
    selected: ThemeColor
    onSelect: (theme: ThemeColor) => void
    onRemove?: (theme: ThemeColor) => void
}) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    return (
        <EdgeFadeScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ columnGap: 10 }}
            edgeLength={edgeLength}
            edgeColour={edgeColour ?? color.neutral._100}>
            {themes.map((theme) => {
                const active = selected.name === theme.name
                const custom = !DefaultColorSchemes.schemes.some((item) => item.name === theme.name)
                return (
                    <Pressable
                        key={theme.name}
                        onPress={() => onSelect(theme)}
                        accessibilityRole="button"
                        accessibilityLabel={theme.name}
                        accessibilityState={{ selected: active }}
                        style={{
                            width: 148,
                            padding: 12,
                            rowGap: 12,
                            borderRadius: 12,
                            overflow: 'hidden',
                            borderWidth: 2,
                            borderColor: active ? theme.primary._500 : theme.neutral._300,
                            backgroundColor: theme.neutral._100,
                        }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                height: 30,
                                borderRadius: 6,
                                overflow: 'hidden',
                            }}>
                            <View style={{ flex: 1, backgroundColor: theme.primary._500 }} />
                            <View style={{ flex: 1, backgroundColor: theme.neutral._300 }} />
                        </View>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                columnGap: 6,
                            }}>
                            <Text numberOfLines={2} style={{ flex: 1, color: theme.text._100 }}>
                                {theme.name}
                            </Text>
                            <View style={{ width: 16, height: 16 }}>
                                {active && (
                                    <AntDesign
                                        name="check-circle"
                                        size={16}
                                        color={theme.primary._500}
                                    />
                                )}
                            </View>
                        </View>
                        {custom && onRemove && (
                            <View style={{ alignItems: 'flex-end', marginTop: 'auto' }}>
                                <IconButton
                                    iconName="delete"
                                    variant="tertiary"
                                    iconSize={16}
                                    iconStyle={{ color: theme.error._400 }}
                                    accessibilityLabel={t(
                                        'settings.colors.alert.deleteTheme.confirm'
                                    )}
                                    onPress={(event) => {
                                        event.stopPropagation()
                                        onRemove(theme)
                                    }}
                                />
                            </View>
                        )}
                    </Pressable>
                )
            })}
        </EdgeFadeScrollView>
    )
}
export default ThemePalettePicker
