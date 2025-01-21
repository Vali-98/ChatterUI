module.exports = {
    input: ['app/**/*.{js,jsx,ts,tsx}'],
    output: '.app/locales',
    options: {
        debug: false,
        func: {
            list: ['t'],
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        trans: {
            component: ['Trans', 'TText'],
            i18nKey: 'i18nKey',
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            fallbackKey: (ns, value) => value,
        },
        lngs: ['en', 'es'],
        ns: ['translation'],
        defaultLng: 'en',
        defaultNs: 'translation',
        resource: {
            loadPath: 'app/locales/{{lng}}/{{ns}}.json',
            savePath: 'app/locales/{{lng}}/{{ns}}.json',
            jsonIndent: 4,
        },
        keySeparator: false,
        nsSeparator: false,
    },
}
