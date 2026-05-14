import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import DropdownSheet from '@components/input/DropdownSheet'
import SectionTitle from '@components/text/SectionTitle'
import { supportedLanguages, useLanguageStore } from 'i18n/i18n'

const GeneratingSettings = () => {
    const { i18n, t } = useTranslation()
    const { language, setLanguage } = useLanguageStore()

    const handleSetLanguage = (lang: string) => {
        i18n.changeLanguage(lang)
        setLanguage(lang)
    }

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.language.title')}</SectionTitle>
            <DropdownSheet
                selected={supportedLanguages.find((item) => item.id === language)}
                data={supportedLanguages}
                onChangeValue={(item) => handleSetLanguage(item.id)}
                labelExtractor={(item) => item.label}
            />
        </View>
    )
}

export default GeneratingSettings
