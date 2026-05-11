import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'

const GeneratingSettings = () => {
    const { t } = useTranslation()
    const [printContext, setPrintContext] = useMMKVBoolean(AppSettings.PrintContext)
    const [bypassContextLength, setBypassContextLength] = useMMKVBoolean(
        AppSettings.BypassContextLength
    )
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.generating.title')}</SectionTitle>

            <ThemedSwitch
                label={t('settings.generating.printContext')}
                value={printContext}
                onChangeValue={setPrintContext}
                description={t('settings.generating.printContextDescription')}
            />

            <ThemedSwitch
                label={t('settings.generating.bypassContextLength')}
                value={bypassContextLength}
                onChangeValue={setBypassContextLength}
                description={t('settings.generating.bypassContextLengthDescription')}
            />
        </View>
    )
}

export default GeneratingSettings
