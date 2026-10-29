import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import SelectionSheet from '@components/input/SelectionSheet'
import SettingsLink from '@components/settings/SettingsLink'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import { supportedLanguages, useLanguageStore } from '@i18n/i18n'

const LanguageSettings = () => {
    const { i18n, t } = useTranslation()
    const { language, setLanguage } = useLanguageStore()
    const ref = useBottomSheetRef()
    return (
        <View>
            <SettingsLink
                icon="global"
                title={t('settings.language.title')}
                onPress={() => ref.current?.open()}
            />
            <SelectionSheet
                ref={ref}
                items={supportedLanguages}
                keyExtractor={(item) => item.id}
                labelExtractor={(item) => item.label}
                selectedKey={language}
                title={t('settings.language.title')}
                onSelect={async (item) => {
                    await i18n.changeLanguage(item.id)
                    setLanguage(item.id)
                }}
            />
        </View>
    )
}
export default LanguageSettings
