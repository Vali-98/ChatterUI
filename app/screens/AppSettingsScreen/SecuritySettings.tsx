import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'

const SecuritySettings = () => {
    const { t } = useTranslation()
    const [authLocal, setAuthLocal] = useMMKVBoolean(AppSettings.LocallyAuthenticateUser)
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.security.title')}</SectionTitle>
            <ThemedSwitch
                label={t('settings.security.lockApp')}
                value={authLocal}
                onChangeValue={setAuthLocal}
                description={t('settings.security.lockAppDescription')}
            />
        </View>
    )
}

export default SecuritySettings
