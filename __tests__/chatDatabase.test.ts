import { db } from '../lib/state/chat/db'

// Exercise the production Expo Drizzle adapter against real SQLite when Node provides it.
// Action tests below this layer remain available on older Node releases.
jest.mock('../db/db', () => {
    const { drizzle } = require('drizzle-orm/expo-sqlite')
    const fs = require('fs')
    const path = require('path')
    const schema = require('../db/schema')
    const sqlite = process.getBuiltinModule?.('node:sqlite') as
        | typeof import('node:sqlite')
        | undefined
    let connection = sqlite
        ? new sqlite.DatabaseSync(':memory:', { enableDoubleQuotedStringLiterals: true })
        : undefined
    if (connection && typeof connection.prepare('SELECT 1').setReturnArrays !== 'function') {
        connection.close()
        connection = undefined
    }
    if (connection) {
        const directory = path.join(__dirname, '../db/migrations')
        const journal = JSON.parse(
            fs.readFileSync(path.join(directory, 'meta/_journal.json'), 'utf8')
        )
        for (const { tag } of journal.entries)
            connection.exec(fs.readFileSync(path.join(directory, `${tag}.sql`), 'utf8'))
        connection.exec('PRAGMA foreign_keys = ON')
    }
    const statements: string[] = []
    const client = {
        prepareSync: (sql: string) => {
            if (!connection) throw new Error('Node SQLite is unavailable')
            const statement = connection.prepare(sql)
            const execute = (params: import('node:sqlite').SQLInputValue[]) => {
                statements.push(sql)
                if (statement.columns().length) {
                    statement.setReturnArrays(true)
                    const rows = statement.all(...params)
                    return { getAllSync: () => rows, getFirstSync: () => rows[0] }
                }
                const result = statement.run(...params)
                return {
                    changes: result.changes,
                    lastInsertRowId: result.lastInsertRowid,
                    getAllSync: () => [],
                }
            }
            return { executeSync: execute, executeForRawResultSync: execute }
        },
    }
    const database = drizzle(client, { schema })
    return {
        db: database,
        connection: connection,
        statements: statements,
        reset: () => {
            connection!.exec('DROP TRIGGER IF EXISTS fail_swipe; DELETE FROM characters')
            database
                .insert(schema.characters)
                .values({ id: 1, type: 'character', name: 'Character' })
                .run()
            statements.length = 0
        },
    }
})

const { connection, statements, reset } = require('../db/db') as {
    connection?: import('node:sqlite').DatabaseSync
    statements: string[]
    reset: () => void
}
const describeSQLite = connection ? describe : describe.skip
const message = (text: string) => ({
    name: 'Character',
    is_user: false,
    swipes: [{ swipe: text, active: true }],
})

afterAll(() => connection?.close())

describeSQLite('chat database integration', () => {
    beforeEach(reset)

    test('creates an empty chat without attempting empty bulk inserts', () => {
        const id = db.create.chat({ character_id: 1 })
        expect(db.query.chat(id)?.messages).toEqual([])
        expect(db.query.chatMetadata(id)?.messageCount).toBe(0)
        expect(db.query.chatMetadata(99999)).toBeUndefined()
    })

    test('active flags determine selection even when the legacy index says otherwise', () => {
        const id = db.create.chat({
            character_id: 1,
            messages: [
                {
                    ...message('unused'),
                    swipes: [
                        { swipe: 'inactive', active: false },
                        { swipe: 'chosen', active: true },
                    ],
                },
            ],
        })
        const chat = db.query.chat(id)!
        expect(chat.messages[0].swipe_id).toBe(0)
        expect(chat.messages[0].swipes.map((swipe) => swipe.swipe)).toEqual(['chosen'])
        expect(db.query.chatCopy(id)!.messages[0].swipes).toHaveLength(2)
        expect(db.live.activeSwipe(chat.messages[0].id).sync()?.swipe).toBe('chosen')
        expect(db.query.searchResults(1, 'inactive')).toEqual([])
        expect(db.query.searchResults(1, 'chosen')[0].message_id).toBe(chat.messages[0].id)
    })

    test('does not fall back to the first swipe when none is active', () => {
        const id = db.create.chat({
            character_id: 1,
            messages: [
                {
                    ...message('unused'),
                    swipes: [{ swipe: 'inactive', active: false }],
                },
            ],
        })
        expect(db.query.chat(id)!.messages[0].swipes).toEqual([])
        expect(db.query.searchResults(1, 'inactive')).toEqual([])
    })

    test('messages are chronological and fork boundaries use owned message IDs', () => {
        const id = db.create.chat({
            character_id: 1,
            messages: [message('first'), message('second'), message('third')],
        })
        const messages = db.query.chat(id)!.messages
        expect(messages.map((item) => item.swipes[0].swipe)).toEqual(['first', 'second', 'third'])
        expect(db.query.chatCopy(id, { throughMessageId: messages[1].id })!.messages).toHaveLength(
            2
        )
        const otherId = db.create.chat({ character_id: 1, messages: [message('other')] })
        expect(db.query.chatCopy(otherId, { throughMessageId: messages[1].id })).toBeUndefined()
    })

    test('creating and activating swipes leave exactly one active variant per message', () => {
        const id = db.create.chat({
            character_id: 1,
            messages: [message('first'), message('other message')],
        })
        const original = db.query.chat(id)!.messages[0].swipes[0]
        statements.length = 0
        const replacement = db.create.swipe(original.entry_id, { swipe: 'replacement' })
        expect(statements[0]).toBe('begin')
        expect(statements[statements.length - 1]).toBe('commit')
        expect(db.live.activeSwipe(original.entry_id).sync()?.id).toBe(replacement.id)
        expect(db.update.activeSwipe(original.id)).toBe(true)
        expect(
            db.query
                .chatCopy(id)!
                .messages[0].swipes.filter((swipe) => swipe.active)
                .map((swipe) => swipe.id)
        ).toEqual([original.id])
        expect(db.query.chat(id)!.messages[1].swipes[0].active).toBe(true)
        expect(db.update.activeSwipe(-100)).toBe(false)
    })

    test('a failed nested insert rolls back the entire copied chat', () => {
        connection!.exec(
            "CREATE TRIGGER fail_swipe BEFORE INSERT ON chat_swipes WHEN new.swipe = 'fail' BEGIN SELECT RAISE(ABORT, 'test insert failure'); END"
        )
        expect(() =>
            db.create.chat({ character_id: 1, messages: [message('good'), message('fail')] })
        ).toThrow('test insert failure')
        expect(db.query.latestChat()).toBeUndefined()
        expect(connection!.prepare('SELECT COUNT(*) AS count FROM chat_entries').get()?.count).toBe(
            0
        )
        expect(connection!.prepare('SELECT COUNT(*) AS count FROM chat_swipes').get()?.count).toBe(
            0
        )
        expect(statements).toContain('rollback')
    })

    test('a copied tree gets new parent IDs and message deletion cascades', () => {
        const id = db.create.chat({
            character_id: 1,
            messages: [
                {
                    ...message('with image'),
                    attachments: [
                        {
                            name: 'image.png',
                            uri: '/copy/image.png',
                            type: 'image',
                            mime_type: 'image/png',
                        },
                    ],
                },
            ],
        })
        const item = db.query.chat(id)!.messages[0]
        expect(item.attachments[0].chat_entry_id).toBe(item.id)
        expect(item.swipes[0].entry_id).toBe(item.id)
        db.delete.message(item.id)
        expect(db.query.chatAttachments(id)).toEqual([])
        expect(db.query.swipe(item.swipes[0].id)).toBeUndefined()
        expect(db.query.chat(id)?.messages).toEqual([])
    })

    test('token and reset metadata do not change the chat modification date', () => {
        const id = db.create.chat({ character_id: 1, messages: [message('text')] })
        db.update.chat(id, { name: 'original' })
        const modified = db.query.chatRow(id)!.last_modified
        const swipe = db.query.chat(id)!.messages[0].swipes[0]
        statements.length = 0
        db.update.swipe(swipe.id, { token_length: 12, reset_length: 4 })
        expect(db.query.chatRow(id)!.last_modified).toBe(modified)
        expect(statements.some((sql) => sql.startsWith('update "chats"'))).toBe(false)
    })

    test('deleting a chat cascades messages, swipes, and attachment rows', () => {
        const id = db.create.chat({
            character_id: 1,
            messages: [
                {
                    ...message('text'),
                    attachments: [
                        { name: 'a.png', uri: '/a.png', type: 'image', mime_type: 'image/png' },
                    ],
                },
            ],
        })
        const swipeId = db.query.chat(id)!.messages[0].swipes[0].id
        db.delete.chat(id)
        expect(db.query.chatRow(id)).toBeUndefined()
        expect(db.query.swipe(swipeId)).toBeUndefined()
        expect(db.query.chatAttachments(id)).toEqual([])
    })
})
