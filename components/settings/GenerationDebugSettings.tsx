import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'

const GenerationDebugSettings = () => {
    const { t } = useTranslation()
    const [printContext, setPrintContext] = useMMKVBoolean(AppSettings.PrintContext)
    const [bypassContextLength, setBypassContextLength] = useMMKVBoolean(
        AppSettings.BypassContextLength
    )
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.categories.advanced.contextTitle')}</SectionTitle>

            <ThemedSwitchRow
                label={t('settings.generating.printContext')}
                value={printContext}
                onChangeValue={setPrintContext}
                description={t('settings.generating.printContextDescription')}
            />

            <ThemedSwitchRow
                label={t('settings.generating.bypassContextLength')}
                value={bypassContextLength}
                onChangeValue={setBypassContextLength}
                description={t('settings.generating.bypassContextLengthDescription')}
            />
        </View>
    )
}

export default GenerationDebugSettings
