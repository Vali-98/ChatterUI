import fs from 'fs'
import path from 'path'

const localesDir = path.join(__dirname, '../i18n/locales')

function getLocaleKeys(locale: string): string[] {
    const directory = path.join(localesDir, locale)
    return fs
        .readdirSync(directory)
        .filter((file) => file.endsWith('.json'))
        .flatMap((file) =>
            Object.keys(JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')))
        )
        .sort()
}

describe('i18n locale consistency', () => {
    const baseKeys = getLocaleKeys('en')
    const locales = fs
        .readdirSync(localesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'en')
        .map((entry) => entry.name)

    test.each(locales)('%s should contain the same keys as English', (locale) => {
        expect(getLocaleKeys(locale)).toEqual(baseKeys)
    })
})
