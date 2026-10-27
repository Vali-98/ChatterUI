import { useTranslation } from 'react-i18next'

import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SettingsPage from '@components/settings/SettingsPage'
import SectionTitle from '@components/text/SectionTitle'
import TText from '@components/text/TText'
import { useSummarySettingsStore } from '@lib/summaries/settingsStore'

const SummarySettingsScreen = () => {
    const { t } = useTranslation()
    const settings = useSummarySettingsStore()
    return (
        <SettingsPage title={t('summary.settings')}>
            <ThemedSwitchRow
                divider
                label={t('summary.enabled')}
                value={settings.enabled}
                onChangeValue={(enabled) => settings.update({ enabled })}
            />
            {settings.enabled && (
                <>
                    <ThemedSwitchRow
                        label={t('summary.autoGenerate')}
                        value={settings.autoGenerate}
                        onChangeValue={(autoGenerate) => settings.update({ autoGenerate })}
                    />
                    {settings.autoGenerate && (
                        <>
                            <ThemedSlider
                                label={t('summary.threshold')}
                                min={25}
                                max={95}
                                step={5}
                                value={settings.autoThreshold}
                                onValueChange={(autoThreshold) =>
                                    settings.update({ autoThreshold })
                                }
                            />
                            <ThemedSwitchRow
                                label={t('summary.autoContinue')}
                                description={t('summary.autoContinueDescription')}
                                value={settings.autoContinueDrafts}
                                onChangeValue={(autoContinueDrafts) =>
                                    settings.update({ autoContinueDrafts })
                                }
                            />
                        </>
                    )}
                    <ThemedSlider
                        label={t('summary.outputTokens')}
                        min={128}
                        max={2048}
                        step={128}
                        value={settings.maxOutputTokens}
                        onValueChange={(maxOutputTokens) => settings.update({ maxOutputTokens })}
                    />
                    <ThemedSwitchRow
                        divider
                        label={t('summary.warnOnChanges')}
                        value={settings.warnOnSourceChanges}
                        onChangeValue={(warnOnSourceChanges) =>
                            settings.update({ warnOnSourceChanges })
                        }
                    />
                    <SectionTitle>{t('summary.prompt')}</SectionTitle>
                    <ThemedTextInput
                        multiline
                        value={settings.prompt}
                        onChangeText={(prompt) => settings.update({ prompt })}
                        containerStyle={{ flex: 0 }}
                    />
                    <TText color="400">{t('summary.historyDescription')}</TText>
                </>
            )}
        </SettingsPage>
    )
}
export default SummarySettingsScreen
