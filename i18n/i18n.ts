import { getLocales } from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
// import { I18nManager } from 'react-native' may be needed by rtl

import en from './locales/en.json'

const lang = getLocales()[0].languageCode ?? 'en'

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
    // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
    resources: {
        en: {
            translation: en,
        },
    },
    lng: lang,
    fallbackLng: 'en',

    interpolation: {
        escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
})

export default i18n
