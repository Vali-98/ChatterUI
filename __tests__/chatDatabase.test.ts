import { migrateSwipeReasoning } from '../db/reasoningMigration'
import { db as database } from '../db/db'
import { acquireChatLease, releaseChatLease, useChatAccessState } from '../lib/state/chat/access'
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
    beforeEach(() => {
        useChatAccessState.setState({ leases: {} })
        reset()
    })

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

describeSQLite('chat mutation ownership and turn transactions', () => {
    beforeEach(() => {
        useChatAccessState.setState({ leases: {} })
        reset()
    })
    test('a leased chat blocks edits and deletion while its owner can save output', () => {
        const chatId = db.create.chat({ character_id: 1, messages: [message('original')] })
        const entry = db.query.chat(chatId)!.messages[0]
        const swipe = entry.swipes[0]
        const token = acquireChatLease(chatId)
        expect(() => db.delete.chat(chatId)).toThrow('busy')
        expect(() => db.delete.message(entry.id)).toThrow('busy')
        expect(() => db.update.swipe(swipe.id, { swipe: 'external edit' })).toThrow('busy')
        expect(() => db.update.activeSwipe(swipe.id)).toThrow('busy')
        expect(() => db.create.swipe(entry.id, { swipe: 'new' })).toThrow('busy')
        expect(() => db.update.chat(chatId, { name: 'rename' })).toThrow('busy')
        expect(() => db.update.chat(chatId, { scroll_offset: 2 })).not.toThrow()
        expect(() => db.update.swipe(swipe.id, { token_length: 12 })).not.toThrow()
        db.update.swipe(swipe.id, { swipe: 'owned output' }, { mutationToken: token })
        expect(db.query.swipe(swipe.id)?.swipe).toBe('owned output')
        releaseChatLease(chatId, token)
        expect(() => db.delete.chat(chatId)).not.toThrow()
    })
    test('assistant insertion failure rolls back the user message too', () => {
        const chatId = db.create.chat({ character_id: 1 })
        connection!.exec(
            "CREATE TRIGGER fail_swipe BEFORE INSERT ON chat_swipes WHEN NEW.swipe = 'fail' BEGIN SELECT RAISE(ABORT, 'failed assistant'); END"
        )
        expect(() =>
            db.create.turn(chatId, {
                user: { ...message('hello'), is_user: true },
                assistant: message('fail'),
            })
        ).toThrow()
        expect(db.query.chat(chatId)?.messages).toEqual([])
    })
})

describeSQLite('separate swipe reasoning', () => {
    beforeEach(() => {
        useChatAccessState.setState({ leases: {} })
        reset()
    })
    const create = () => {
        const chatId = db.create.chat({ character_id: 1, messages: [message('Answer')] })
        const swipeId = db.query.chat(chatId)!.messages[0].swipes[0].id
        return { chatId, swipeId }
    }
    test('UI reads include reasoning; default context reads do not fetch it', () => {
        const { chatId, swipeId } = create()
        db.update.swipe(swipeId, { reasoning: 'Private thought' })
        statements.length = 0
        const chat = db.live.chat(chatId).sync()!
        expect(chat.messages[0].swipes[0].reasoning).toBeUndefined()
        expect(statements.some((sql) => sql.includes('swipe_reasoning'))).toBe(false)
        const entry = db.live.message(chat.messages[0].id).sync()!
        expect(entry.swipes[0].reasoning?.content).toBe('Private thought')
        expect(
            db.live.chat(chatId, { includeReasoning: true }).sync()!.messages[0].swipes[0].reasoning
                ?.content
        ).toBe('Private thought')
    })
    test('inserts/imports normalize assistant text but preserve literal user messages', () => {
        const chatId = db.create.chat({
            character_id: 1,
            messages: [
                message('<think>Private</think>Answer'),
                { ...message('<think>User text</think>'), is_user: true },
            ],
        })
        const chat = db.query.chatCopy(chatId)!
        expect(chat.messages[0].swipes[0]).toMatchObject({
            swipe: 'Answer',
            reasoning: { content: 'Private' },
        })
        expect(chat.messages[1].swipes[0]).toMatchObject({
            swipe: '<think>User text</think>',
            reasoning: null,
        })
    })
    test('reasoning checkpoints survive edits and cascade with their owning swipe', () => {
        const { chatId, swipeId } = create()
        db.update.swipe(swipeId, { reasoning: 'Original and continued', resetReasoningLength: 8 })
        db.update.swipe(swipeId, { reasoning: 'Edited' })
        expect(db.query.reasoning(swipeId)).toMatchObject({ content: 'Edited', reset_length: 8 })
        const lease = acquireChatLease(chatId)
        expect(() => db.update.swipe(swipeId, { reasoning: 'Forbidden' })).toThrow()
        releaseChatLease(chatId, lease)
        db.delete.chat(chatId)
        expect(db.query.reasoning(swipeId)).toBeUndefined()
    })
    test('legacy conversion is repeatable and leaves user text and timestamps untouched', () => {
        const { chatId, swipeId } = create()
        const user = db.create.message(chatId, {
            ...message('<think>Keep user literal</think>'),
            is_user: true,
        })
        connection!
            .prepare(
                'UPDATE chat_swipes SET swipe = ?, token_length = 50, reset_length = 3 WHERE id = ?'
            )
            .run('<think>Private</think>Answer', swipeId)
        const before = db.query.swipe(swipeId)!
        migrateSwipeReasoning(database)
        migrateSwipeReasoning(database)
        expect(db.query.swipe(swipeId)).toMatchObject({
            swipe: 'Answer',
            token_length: null,
            reset_length: null,
            send_date: before.send_date,
        })
        expect(db.query.reasoning(swipeId)?.content).toBe('Private')
        expect(db.live.message(user.id).sync()!.swipes[0].swipe).toBe(
            '<think>Keep user literal</think>'
        )
    })
    test('a failed reasoning write rolls back the answer update', () => {
        const { swipeId } = create()
        connection!.exec(
            "CREATE TEMP TRIGGER fail_reasoning BEFORE INSERT ON swipe_reasoning BEGIN SELECT RAISE(ABORT, 'test failure'); END"
        )
        try {
            expect(() =>
                db.update.swipe(swipeId, { swipe: 'Changed', reasoning: 'Thought' })
            ).toThrow()
            expect(db.query.swipe(swipeId)?.swipe).toBe('Answer')
        } finally {
            connection!.exec('DROP TRIGGER fail_reasoning')
        }
    })
    test('a failed legacy conversion rolls back all converted rows before retry', () => {
        const { chatId, swipeId } = create()
        const other = db.create.message(chatId, message('Other')).swipes[0].id
        for (const id of [swipeId, other])
            connection!
                .prepare('UPDATE chat_swipes SET swipe = ? WHERE id = ?')
                .run('<think>Private</think>Answer', id)
        connection!.exec(
            `CREATE TEMP TRIGGER fail_migration BEFORE INSERT ON swipe_reasoning WHEN NEW.swipe_id = ${other} BEGIN SELECT RAISE(ABORT, 'test failure'); END`
        )
        try {
            expect(() => migrateSwipeReasoning(database)).toThrow()
            expect(db.query.swipe(swipeId)?.swipe).toBe('<think>Private</think>Answer')
            expect(db.query.reasoning(swipeId)).toBeUndefined()
        } finally {
            connection!.exec('DROP TRIGGER fail_migration')
        }
        migrateSwipeReasoning(database)
        expect(db.query.swipe(swipeId)?.swipe).toBe('Answer')
        expect(db.query.reasoning(other)?.content).toBe('Private')
    })
    test('rerunning conversion preserves existing reasoning when inline content is found', () => {
        const { swipeId } = create()
        db.update.swipe(swipeId, {
            swipe: '<think>Additional</think>Answer',
            reasoning: 'Original',
        })
        migrateSwipeReasoning(database)
        expect(db.query.swipe(swipeId)?.swipe).toBe('Answer')
        expect(db.query.reasoning(swipeId)?.content).toBe('Original\n\nAdditional')
        migrateSwipeReasoning(database)
        expect(db.query.reasoning(swipeId)?.content).toBe('Original\n\nAdditional')
    })
})
