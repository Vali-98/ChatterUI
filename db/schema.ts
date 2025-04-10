import { relations, sql } from 'drizzle-orm'
import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core'

// TAVERN V2 SPEC

export const characters = sqliteTable('characters', {
    id: integer('id', { mode: 'number' }).notNull().primaryKey(),
    type: text('type', { enum: ['user', 'character'] }).notNull(),

    name: text('name').notNull().default('User'),
    description: text('description').notNull().default(''),
    first_mes: text('first_mes').notNull().default(''),
    mes_example: text('mes_example').notNull().default(''),
    creator_notes: text('creator_notes').notNull().default(''),
    system_prompt: text('system_prompt').notNull().default(''),
    scenario: text('scenario').notNull().default(''),
    personality: text('personality').notNull().default(''),
    post_history_instructions: text('post_history_instructions').notNull().default(''),
    //character_book: text('character_book').default(''),
    image_id: integer('image_id', { mode: 'number' })
        .notNull()
        .$defaultFn(() => Date.now()),
    creator: text('creator').notNull().default(''),
    character_version: text('character_version').notNull().default(''),
    last_modified: integer('last_modified', { mode: 'number' })
        .$defaultFn(() => Date.now())
        .$onUpdateFn(() => Date.now()),
    //.default(sql`(unixepoch('subsec')*1000)`)
    //.$onUpdate(() => sql`(unixepoch('subsec')*1000)`),
})

export const characterGreetings = sqliteTable('character_greetings', {
    id: integer('id', { mode: 'number' }).notNull().primaryKey(),
    character_id: integer('character_id')
        .notNull()
        .references(() => characters.id, { onDelete: 'cascade' }),
    greeting: text('greeting').notNull(),
})

export const tags = sqliteTable('tags', {
    id: integer('id', { mode: 'number' }).notNull().primaryKey(),
    tag: text('tag').notNull().unique(),
})

export const characterTags = sqliteTable(
    'character_tags',
    {
        character_id: integer('character_id', { mode: 'number' })
            .notNull()
            .references(() => characters.id, { onDelete: 'cascade' }),
        tag_id: integer('tag_id', { mode: 'number' })
            .notNull()
            .references(() => tags.id, { onDelete: 'cascade' }),
    },
    (table) => {
        return { pk: primaryKey({ columns: [table.character_id, table.tag_id] }) }
    }
)

export const characterRelations = relations(characters, ({ many }) => ({
    alternate_greetings: many(characterGreetings),
    tags: many(characterTags),
    lorebooks: many(characterLorebooks),
    chats: many(chats),
}))

export const greetingsRelations = relations(characterGreetings, ({ one }) => ({
    character_id: one(characters, {
        fields: [characterGreetings.character_id],
        references: [characters.id],
    }),
}))

export const characterTagsRelations = relations(characterTags, ({ one }) => ({
    tag: one(tags, {
        fields: [characterTags.tag_id],
        references: [tags.id],
    }),
    character: one(characters, {
        fields: [characterTags.character_id],
        references: [characters.id],
    }),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
    characters: many(characterTags),
}))

// CHATS

export const chats = sqliteTable('chats', {
    id: integer('id', { mode: 'number' }).primaryKey().notNull(),
    create_date: integer('create_date', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    character_id: integer('character_id', { mode: 'number' })
        .notNull()
        .references(() => characters.id, { onDelete: 'cascade' }),
    user_id: integer('user_id', { mode: 'number' }),
    last_modified: integer('last_modified', { mode: 'number' })
        .$defaultFn(() => Date.now())
        .$onUpdateFn(() => Date.now()),
    name: text('name').notNull().default('New Chat'),
})

export const chatEntries = sqliteTable('chat_entries', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    chat_id: integer('chat_id', { mode: 'number' })
        .notNull()
        .references(() => chats.id, { onDelete: 'cascade' }),
    is_user: integer('is_user', { mode: 'boolean' }).notNull(),
    name: text('name').notNull(),
    order: integer('order').notNull(),
    swipe_id: integer('swipe_id', { mode: 'number' }).default(0).notNull(),
})

export const chatSwipes = sqliteTable('chat_swipes', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    entry_id: integer('entry_id', { mode: 'number' })
        .notNull()
        .references(() => chatEntries.id, { onDelete: 'cascade' }),
    swipe: text('swipe').notNull().default(''),

    send_date: integer('send_date', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),

    gen_started: integer('gen_started', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),

    gen_finished: integer('gen_finished', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    timings: text('timings', { mode: 'json' }).$type<CompletionTimings>(),
})

export const chatsRelations = relations(chats, ({ many, one }) => ({
    messages: many(chatEntries),
    character: one(characters, {
        fields: [chats.character_id],
        references: [characters.id],
    }),
}))

export const chatEntriesRelations = relations(chatEntries, ({ one, many }) => ({
    chat: one(chats, {
        fields: [chatEntries.chat_id],
        references: [chats.id],
    }),
    swipes: many(chatSwipes),
}))

export const swipesRelations = relations(chatSwipes, ({ one }) => ({
    entry: one(chatEntries, {
        fields: [chatSwipes.entry_id],
        references: [chatEntries.id],
    }),
}))

// INSTRUCT

export const instructs = sqliteTable('instructs', {
    id: integer('id', { mode: 'number' }).primaryKey(),
    name: text('name').notNull(),

    system_prompt: text('system_prompt').notNull(),
    system_prefix: text('system_prefix').notNull(),
    system_suffix: text('system_suffix').notNull(),
    input_prefix: text('inpput_prefix').notNull(),
    input_suffix: text('input_suffix').notNull(),
    output_suffix: text('output_suffix').notNull(),
    output_prefix: text('output_prefix').notNull(),
    stop_sequence: text('stop_sequence').notNull(),
    activation_regex: text('activation_regex').notNull(),
    user_alignment_message: text('user_alignment_message').notNull(),
    wrap: integer('wrap', { mode: 'boolean' }).notNull(),
    macro: integer('macro', { mode: 'boolean' }).notNull(),
    names: integer('names', { mode: 'boolean' }).notNull(),
    names_force_groups: integer('names_force_groups', { mode: 'boolean' }).notNull(),

    // Additions 3/7/2024, v3
    timestamp: integer('timestamp', { mode: 'boolean' }).notNull().default(false),
    examples: integer('examples', { mode: 'boolean' }).notNull().default(true),
    format_type: integer('format_type').notNull().default(0),

    // additions 22/9/2024, v4
    last_output_prefix: text('last_output_prefix').notNull().default(''),

    // additions 17/10/2024 v5
    scenario: integer('scenario', { mode: 'boolean' }).notNull().default(true),
    personality: integer('personality', { mode: 'boolean' }).notNull().default(true),
})

// LOREBOOKS

export const lorebooks = sqliteTable('lorebooks', {
    id: integer('id', { mode: 'number' }).primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    scanDepth: integer('scan_depth'),
    tokenBudget: integer('token_budget'),
    recursiveScanning: integer('recursive_scanning', { mode: 'boolean' }).default(false),
})

export const lorebookEntries = sqliteTable('lorebook_entries', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    lorebook_id: integer('lorebook_id', { mode: 'number' })
        .notNull()
        .references(() => lorebooks.id, { onDelete: 'cascade' }),
    keys: text('keys').notNull(),
    content: text('content').notNull(),
    enable: integer('enable', { mode: 'boolean' }).default(true),
    insertion_order: integer('insertion_order').default(100),
    case_sensitive: integer('case_sensitive', { mode: 'boolean' }).default(true),

    name: text('name').notNull(),
    priority: integer('priority').default(100),
})

export const characterLorebooks = sqliteTable(
    'character_lorebooks',
    {
        character_id: integer('character_id', { mode: 'number' }).references(() => characters.id, {
            onDelete: 'cascade',
        }),
        lorebook_id: integer('lorebook_id', { mode: 'number' }).references(() => lorebooks.id, {
            onDelete: 'cascade',
        }),
    },
    (table) => {
        return { pk: primaryKey({ columns: [table.character_id, table.lorebook_id] }) }
    }
)

export const lorebooksRelations = relations(lorebooks, ({ many }) => ({
    entries: many(lorebookEntries),
    lorebooks: many(characterLorebooks),
}))

export const lorebookEntriesRelations = relations(lorebookEntries, ({ one }) => ({
    lorebook: one(lorebooks, {
        fields: [lorebookEntries.lorebook_id],
        references: [lorebooks.id],
    }),
}))

export const characterLorebooksRelations = relations(characterLorebooks, ({ one }) => ({
    character: one(characters, {
        fields: [characterLorebooks.character_id],
        references: [characters.id],
    }),
    lorebook: one(lorebooks, {
        fields: [characterLorebooks.lorebook_id],
        references: [lorebooks.id],
    }),
}))

// TODO:

////// group chats - 2 tables

// export const groupChats = sqliteTable('group_chats', {})

// export const characterGroupChats = sqliteTable('character_group_chats', {})

// Model Data

export const model_data = sqliteTable('model_data', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    file: text('file').notNull().unique(),
    name: text('name').notNull(),
    file_path: text('file_path').notNull().unique().default(''),
    file_size: integer('file_size').notNull().default(0),
    params: text('params').notNull(),
    quantization: text('quantization').notNull(),
    context_length: integer('context_length').notNull(),
    architecture: text('architecture').notNull(),
    create_date: integer('create_date', { mode: 'number' })
        .$defaultFn(() => Date.now())
        .notNull(),
    last_modified: integer('last_modified', { mode: 'number' })
        .$defaultFn(() => Date.now())
        .notNull()
        .$onUpdateFn(() => Date.now()),
})

// Types

export type ModelDataType = typeof model_data.$inferSelect
export type ChatSwipe = typeof chatSwipes.$inferSelect

export type CompletionTimings = {
    predicted_per_token_ms: number
    predicted_per_second: number | null
    predicted_ms: number
    predicted_n: number

    prompt_per_token_ms: number
    prompt_per_second: number | null
    prompt_ms: number
    prompt_n: number
}
