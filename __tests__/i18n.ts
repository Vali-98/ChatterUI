// __tests__/i18n-locales.test.ts

import fs from 'fs'
import path from 'path'

const localesDir = path.join(__dirname, '../i18n/locales')

function getJsonFiles(dir: string): string[] {
    return fs.readdirSync(dir).filter((file) => file.endsWith('.json'))
}

function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
    return Object.entries(obj).flatMap(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return flattenKeys(value, fullKey)
        }

        return [fullKey]
    })
}

describe('i18n locale consistency', () => {
    const baseLocalePath = path.join(localesDir, 'en.json')
    const baseLocale = JSON.parse(fs.readFileSync(baseLocalePath, 'utf8'))

    const baseKeys = flattenKeys(baseLocale).sort()

    const localeFiles = getJsonFiles(localesDir).filter((file) => file !== 'en.json')

    test.each(localeFiles)('%s should contain the same keys as en.json', (file) => {
        const localePath = path.join(localesDir, file)

        const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'))

        const localeKeys = flattenKeys(locale).sort()

        expect(localeKeys).toEqual(baseKeys)
    })
})
