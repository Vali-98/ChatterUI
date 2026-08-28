import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import HorizontalSelector from '@components/input/HorizontalSelector'
import ThemedSlider from '@components/input/ThemedSlider'
import SectionTitle from '@components/text/SectionTitle'
import { LorebookPreferenceStore, useLorebookPreferenceStore } from '@lib/state/lorebooks/state'

const LorebookPreferenceEditor = () => {
    const { insertionDepth, insertionLocation, setPreference } = useLorebookPreferenceStore()
    const { t } = useTranslation()

    const selectorValues: { label: string; value: LorebookPreferenceStore['insertionLocation'] }[] =
        [
            { label: t('lorebook.preferences.beforeLast'), value: 'beforeLast' },
            { label: t('lorebook.preferences.afterLast'), value: 'afterLast' },
            { label: t('lorebook.preferences.afterSystem'), value: 'afterSystem' },
            { label: t('lorebook.preferences.index'), value: 'index' },
        ]

    return (
        <View style={{ rowGap: 24, paddingHorizontal: 8, marginBottom: 8 }}>
            <SectionTitle>{t('common.labels.preferences')}</SectionTitle>
            <HorizontalSelector
                style={{ flex: 0 }}
                label={t('lorebook.preferences.insertionType')}
                values={selectorValues}
                selected={insertionLocation}
                onPress={(selected) => {
                    setPreference('insertionLocation', selected)
                }}
            />
            {insertionLocation === 'index' && (
                <ThemedSlider
                    label={t('lorebook.preferences.insertionDepth')}
                    value={insertionDepth}
                    min={0}
                    max={100}
                    onValueChange={(value) => setPreference('insertionDepth', value)}
                />
            )}
        </View>
    )
}

export default LorebookPreferenceEditor
