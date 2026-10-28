import { useTranslation } from 'react-i18next'
import { Linking, View } from 'react-native'

import ThemePalettePicker from './ThemePalettePicker'
import HorizontalSelector from '@components/input/HorizontalSelector'
import ThemedSwitch from '@components/input/ThemedSwitch'
import TText from '@components/text/TText'
import Alert from '@components/views/Alert'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import InputSheet from '@components/views/InputSheet'
import { Logger } from '@lib/state/Logger'
import { DefaultColorSchemes, type ThemeColor } from '@lib/theme/ThemeColor'
import { Theme } from '@lib/theme/ThemeManager'
import { FileUtils, saveStringToDownload } from '@lib/utils/File'

export type ThemeTarget = 'light' | 'dark'

const ThemePicker = ({
    target,
    onTargetChange,
}: {
    target: ThemeTarget
    onTargetChange: (target: ThemeTarget) => void
}) => {
    const { t } = useTranslation()
    const state = Theme.useColorState()
    const inputRef = useBottomSheetRef()
    const selected = state.useSystemDarkMode
        ? target === 'dark'
            ? state.darkColor
            : state.lightColor
        : state.color
    const select = (theme: ThemeColor) => {
        if (!state.useSystemDarkMode) state.setColor(theme)
        else if (target === 'dark') state.setDarkColor(theme)
        else state.setLightColor(theme)
    }
    const remove = (theme: ThemeColor) =>
        Alert.alert({
            title: t('settings.colors.alert.deleteTheme.title'),
            description: t('settings.colors.alert.deleteTheme.description', { name: theme.name }),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('settings.colors.alert.deleteTheme.confirm'),
                    type: 'warning',
                    onPress: () =>
                        state.removeColorScheme(
                            state.customColors.findIndex((item) => item.name === theme.name)
                        ),
                },
            ],
        })
    return (
        <View style={{ rowGap: 12 }}>
            <HeaderButton
                headerRight={() => (
                    <ContextMenu placement="bottom">
                        <ContextMenu.Trigger icon="setting" />
                        <ContextMenu.Body>
                            <ThemedSwitch
                                label={t('settings.colors.useSystemDarkMode')}
                                value={state.useSystemDarkMode}
                                onChangeValue={state.setUseSystemDarkMode}
                            />
                            <ContextMenu.Divider />
                            <ContextMenu.Button
                                label={t('settings.colors.contextMenu.importTheme')}
                                icon="download"
                                onPress={async () => {
                                    const result = await FileUtils.pickJSON({
                                        type: 'application/json',
                                    })
                                    if (result.success) state.addCustomColor(result.data)
                                }}
                            />
                            <ContextMenu.Button
                                label={t('settings.colors.contextMenu.exportTheme')}
                                icon="upload"
                                onPress={async () => {
                                    const filename =
                                        // eslint-disable-next-line i18next/no-literal-string
                                        selected.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.json'
                                    await saveStringToDownload(
                                        JSON.stringify(selected, null, 2),
                                        filename,
                                        'utf8'
                                    )
                                }}
                            />
                            <ContextMenu.Button
                                label={t('settings.colors.contextMenu.pasteTheme')}
                                icon="file"
                                closeOnPress={false}
                                onPress={(close) => {
                                    close()
                                    inputRef.current?.open()
                                }}
                            />
                            <ContextMenu.Button
                                label={t('settings.colors.contextMenu.getThemes')}
                                icon="github"
                                onPress={() => {
                                    void Linking.openURL(
                                        'https://github.com/Vali-98/ChatterUI/discussions/218'
                                    )
                                }}
                            />
                        </ContextMenu.Body>
                    </ContextMenu>
                )}
            />
            <TText size={18}>{t('settings.colors.title')}</TText>
            {state.useSystemDarkMode && (
                <HorizontalSelector
                    label={t('settings.appearance.editPalette')}
                    selected={target}
                    onPress={onTargetChange}
                    values={[
                        {
                            value: 'light',
                            label: t('settings.appearance.light'),
                            icon: 'light-mode',
                        },
                        { value: 'dark', label: t('settings.appearance.dark'), icon: 'dark-mode' },
                    ]}
                    style={{ flex: 0 }}
                />
            )}
            <ThemePalettePicker
                themes={[...DefaultColorSchemes.schemes, ...state.customColors]}
                selected={selected}
                onSelect={select}
                onRemove={remove}
            />
            <InputSheet
                ref={inputRef}
                title={t('settings.colors.pasteThemeTitle')}
                multiline
                onConfirm={(text) => {
                    try {
                        state.addCustomColor(JSON.parse(text))
                    } catch (error) {
                        Logger.errorToast(
                            t('settings.colors.error.failedToImport', { error: String(error) })
                        )
                    }
                }}
            />
        </View>
    )
}

export default ThemePicker
