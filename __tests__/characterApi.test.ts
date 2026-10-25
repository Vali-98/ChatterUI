import { db } from '../lib/state/characters/db'
import { CharacterLinks } from '../lib/state/characters/links'
import { buildBlankCharacterCard, toCharacterCardV2 } from '../lib/state/characters/schema'
import type { CharacterCard } from '../lib/state/characters/types'

jest.mock('../lib/state/Logger', () => ({ Logger: { warn: jest.fn(), errorToast: jest.fn() } }))
jest.mock('../db/db', () => {
    const { drizzle } = require('drizzle-orm/expo-sqlite')
    const schema = require('../db/schema')
    const statements: { sql: string; params: unknown[] }[] = []
    let resultRows: unknown[][] = []
    const client = {
        prepareSync: (sql: string) => {
            const execute = (params: unknown[]) => {
                statements.push({ sql: sql, params: params })
                return { changes: 1, lastInsertRowId: 41, getAllSync: () => resultRows }
            }
            return { executeSync: execute, executeForRawResultSync: execute }
        },
    }
    return {
        db: drizzle(client, { schema }),
        statements: statements,
        setRows: (rows: unknown[][]) => {
            resultRows = rows
        },
    }
})
const { statements, setRows } = require('../db/db') as {
    statements: { sql: string; params: unknown[] }[]
    setRows: (rows: unknown[][]) => void
}
beforeEach(() => {
    statements.length = 0
    setRows([])
})

test('list options preserve sort, page, and filtering semantics without executing the query', () => {
    const query = db.live
        .cardListWindow({
            type: 'user',
            sortBy: 'name',
            sortDirection: 'asc',
            limit: 15,
            offset: 30,
            searchText: ' Ada ',
            includedTags: ['one', 'two'],
            hiddenTags: ['hidden'],
        })
        .toSQL()
    expect(query.sql).toContain('"name" asc')
    expect(query.sql).toContain('"character_tags"')
    expect(query.params).toEqual(expect.arrayContaining(['user', '%ada%', 'one', 'two', 'hidden']))
    expect(query.params.slice(-2)).toEqual([15, 30])
    expect(statements).toHaveLength(0)
    const defaults = db.live.cardListWindow().toSQL()
    expect(defaults.sql).toContain('"last_modified" desc')
    expect(defaults.params).toContain('character')
    expect(defaults.params.at(-1)).toBe(20)
    expect(defaults.sql).not.toContain(' offset ')
})

test('target-first updates retain snake_case database fields and target the requested card', async () => {
    await db.update.cardFields(17, { name: 'Ada', image_id: 83 })
    const update = statements.at(-1)!
    expect(update.sql).toContain('"image_id" = ?')
    expect(update.params).toEqual(expect.arrayContaining(['Ada', 83]))
    expect(update.params.at(-1)).toBe(17)
    await db.update.backgroundImageReference(17, 91)
    expect(statements.at(-1)!.sql).toContain('"background_image" = ?')
    expect(statements.at(-1)!.params).toContain(91)
    expect(statements.at(-1)!.params.at(-1)).toBe(17)
})

test('blank user cards use the type option and return the inserted identity', async () => {
    setRows([[41]])
    expect(await db.create.blankCard('Persona', { type: 'user' })).toBe(41)
    expect(statements.at(-1)!.params).toEqual(expect.arrayContaining(['Persona', 'user']))
})

test('character link reads use the owning character ID, not the link row ID', async () => {
    const query = CharacterLinks.db.live.links(17).toSQL()
    expect(query.sql).toMatch(/where .*"character_id" = \?/)
    expect(query.params).toContain(17)
    await CharacterLinks.db.query.links(17)
    expect(statements.at(-1)!.sql).toMatch(/where .*"character_id" = \?/)
})

test('link inputs preserve typed target values when upserting and removing references', async () => {
    await CharacterLinks.db.upsert.link(17, { type: 'user_id', value: 42 })
    expect(statements.at(-1)!.params.slice(0, 3)).toEqual([17, 42, 'user_id'])
    await CharacterLinks.db.delete.linksByTarget({ type: 'user_id', value: 42 })
    expect(statements.at(-1)!.params).toEqual(expect.arrayContaining(['user_id', 42]))
    expect(statements.at(-1)!.params).not.toContain(17)
})

test('portable cards keep their external fields and exclude database-only data', () => {
    const portable = buildBlankCharacterCard('Ada', { first_mes: 'Hello {{user}}' })
    expect(portable.data.first_mes).toBe('Hello {{user}}')
    const card = {
        ...portable.data,
        id: 17,
        type: 'character',
        image_id: 83,
        tags: [{ tag_id: 4, tag: { id: 4, tag: 'example' } }],
        alternate_greetings: [{ id: 8, character_id: 17, greeting: 'Other greeting' }],
        links: [],
    } as unknown as CharacterCard
    const exported = toCharacterCardV2(card)
    expect(exported).toEqual({
        ...portable,
        data: { ...portable.data, tags: ['example'], alternate_greetings: ['Other greeting'] },
    })
    expect(exported.data).not.toHaveProperty('id')
    expect(exported.data).not.toHaveProperty('image_id')
})
