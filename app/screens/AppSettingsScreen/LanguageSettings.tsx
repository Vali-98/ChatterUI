import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'

import ListButton from '@components/buttons/ListButton'
import SettingsLink from '@components/settings/SettingsLink'
import TText from '@components/text/TText'
import BottomSheet, { useBottomSheetRef } from '@components/views/BottomSheet'
import { supportedLanguages, useLanguageStore } from '@i18n/i18n'

const LanguageSettings = () => {
    const { i18n, t } = useTranslation()
    const { language, setLanguage } = useLanguageStore()
    const sheetRef = useBottomSheetRef()
    return (
        <View>
            <SettingsLink
                icon="global"
                title={t('settings.language.title')}
                onPress={() => sheetRef.current?.open()}
            />
            <BottomSheet ref={sheetRef}>
                <View style={{ paddingBottom: 12 }}>
                    <TText size={18}>{t('settings.language.title')}</TText>
                </View>
                <ScrollView contentContainerStyle={{ rowGap: 8 }}>
                    {supportedLanguages.map((item) => (
                        <ListButton
                            key={item.id}
                            active={item.id === language}
                            style={{ paddingHorizontal: 16, paddingVertical: 14, minHeight: 48 }}
                            onPress={() => {
                                void i18n.changeLanguage(item.id)
                                setLanguage(item.id)
                                sheetRef.current?.close()
                            }}>
                            <TText>{item.label}</TText>
                        </ListButton>
                    ))}
                </ScrollView>
            </BottomSheet>
        </View>
    )
}

export default LanguageSettings
