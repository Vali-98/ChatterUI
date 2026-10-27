import { setBackgroundColorAsync } from 'expo-system-ui'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, View, useColorScheme } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { SafeAreaView } from 'react-native-safe-area-context'

import HorizontalSelector from '@components/input/HorizontalSelector'
import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import ChatAppearancePreview from '@components/settings/ChatAppearancePreview'
import ThemePicker, { type ThemeTarget } from '@components/settings/ThemePicker'
import SectionTitle from '@components/text/SectionTitle'
import TText from '@components/text/TText'
import HeaderTitle from '@components/views/HeaderTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Characters } from '@lib/state/characters'
import { ChatStyle } from '@lib/state/ChatStyle'
import { Theme, ThemePreview } from '@lib/theme/ThemeManager'

import StyleSettings from './StyleSettings'

const AppearanceSettings = () => {
    const { t } = useTranslation()
    const system = useColorScheme()
    const [target, setTarget] = useState<ThemeTarget>(system === 'dark' ? 'dark' : 'light')
    const [background, setBackground] = useState<'app' | 'character'>('app')
    const { color } = Theme.useTheme()
    const themes = Theme.useColorState()
    const previewTheme = themes.useSystemDarkMode
        ? target === 'dark'
            ? themes.darkColor
            : themes.lightColor
        : themes.color
    const hasCharacterBackground = Characters.useCharacterState(
        (state) => !!state.card?.background_image
    )
    const textStyle = ChatStyle.useChatStyle()
    const [wide, setWide] = useMMKVBoolean(AppSettings.WideChatMode)
    const [alternate, setAlternate] = useMMKVBoolean(AppSettings.AlternatingChatMode)
    useEffect(() => {
        void setBackgroundColorAsync(color.neutral._100)
    }, [color.neutral._100])
    return (
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
            <HeaderTitle title={t('settings.categories.appearance.title')} />
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                <View style={{ paddingHorizontal: 16, rowGap: 24 }}>
                    <ThemePicker target={target} onTargetChange={setTarget} />
                    <View
                        style={{
                            backgroundColor: color.neutral._100,
                        }}>
                        <ThemePreview color={previewTheme}>
                            <ChatAppearancePreview
                                characterBackground={background === 'character'}
                            />
                        </ThemePreview>
                    </View>

                    <View
                        style={{
                            borderTopWidth: 1,
                            borderTopColor: color.neutral._300,
                            paddingTop: 20,
                            rowGap: 12,
                        }}>
                        <SectionTitle>{t('settings.chatstyle.title')}</SectionTitle>
                        <HorizontalSelector
                            label={t('settings.chatstyle.fontSize')}
                            values={ChatStyle.SIZES.map((value) => ({
                                value: value,
                                label: value.toUpperCase(),
                            }))}
                            selected={textStyle.fontSize}
                            onPress={textStyle.setFontSize}
                            style={{ flex: 0 }}
                        />
                        <HorizontalSelector
                            label={t('settings.chatstyle.fontWeight')}
                            values={ChatStyle.WEIGHTS.map((value) => ({
                                value: value,
                                label: value,
                            }))}
                            selected={textStyle.textWeight}
                            onPress={textStyle.setTextWeight}
                            style={{ flex: 0 }}
                        />
                        <ThemedSwitchRow
                            label={t('settings.chatwindow.wideChat')}
                            description={t('settings.chatwindow.wideChatDescription')}
                            value={wide}
                            onChangeValue={setWide}
                        />
                        <ThemedSwitchRow
                            label={t('settings.chatwindow.alternatePositions')}
                            description={t('settings.chatwindow.alternatePositionsDescription')}
                            value={alternate}
                            onChangeValue={setAlternate}
                        />
                    </View>
                    <View
                        style={{
                            borderTopWidth: 1,
                            borderTopColor: color.neutral._300,
                            paddingTop: 20,
                        }}>
                        <StyleSettings />
                        {hasCharacterBackground && (
                            <View style={{ marginTop: 12, rowGap: 8 }}>
                                <HorizontalSelector
                                    selected={background}
                                    onPress={setBackground}
                                    values={[
                                        {
                                            value: 'app',
                                            label: t('settings.appearance.appBackground'),
                                        },
                                        {
                                            value: 'character',
                                            label: t('settings.appearance.characterBackground'),
                                        },
                                    ]}
                                    label={t('settings.appearance.previewBackground')}
                                    style={{ flex: 0 }}
                                />
                                <TText color="400" size={12}>
                                    {t('settings.appearance.backgroundOverride')}
                                </TText>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

export default AppearanceSettings
