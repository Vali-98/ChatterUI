import { relations } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
    image_id: integer('image_id', { mode: 'number' })
        .notNull()
        .$defaultFn(() => Date.now()),
    creator: text('creator').notNull().default(''),
    character_version: text('character_version').notNull().default(''),
    last_modified: integer('last_modified', { mode: 'number' })
        .$defaultFn(() => Date.now())
        .$onUpdateFn(() => Date.now()),
    background_image: integer('background_image', { mode: 'number' }),
    // ─── Live2D ───────────────────────────────────────────────────────────────
    // Absolute path to the .model3.json file inside the app's Live2D directory.
    // Set via importLive2DModel(); null means no Live2D model assigned.
    live2d_model_path: text('live2d_model_path'),
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
    scroll_offset: integer('scroll_offset', { mode: 'number' }).default(0),
})

export const chatEntries = sqliteTable('chat_entries', {
    id: integer('id', { mode: 'number' }).primaryKey().notNull(),
    chat_id: integer('chat_id', { mode: 'number' })
        .notNull()
        .references(() => chats.id, { onDelete: 'cascade' }),
    is_user: integer('is_user', { mode: 'boolean' }).notNull().default(false),
    name: text('name').notNull(),
    order: integer('order', { mode: 'number' }).notNull(),
    swipe_id: integer('swipe_id', { mode: 'number' }).notNull().default(0),
})

export const chatSwipes = sqliteTable('chat_swipes', {
    id: integer('id', { mode: 'number' }).primaryKey().notNull(),
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
    timings: text('timings', { mode: 'json' }),
    token_count: integer('token_count', { mode: 'number' }),
})

export const chatRelations = relations(chats, ({ many, one }) => ({
    messages: many(chatEntries),
    character: one(characters, {
        fields: [chats.character_id],
        references: [characters.id],
    }),
}))

export const chatEntriesRelations = relations(chatEntries, ({ many, one }) => ({
    swipes: many(chatSwipes),
    chat: one(chats, {
        fields: [chatEntries.chat_id],
        references: [chats.id],
    }),
    attachments: many(chatAttachments),
}))

export const chatSwipesRelations = relations(chatSwipes, ({ one }) => ({
    entry: one(chatEntries, {
        fields: [chatSwipes.entry_id],
        references: [chatEntries.id],
    }),
}))

export const chatAttachments = sqliteTable('chat_attachments', {
    id: integer('id', { mode: 'number' }).primaryKey().notNull(),
    entry_id: integer('entry_id', { mode: 'number' })
        .notNull()
        .references(() => chatEntries.id, { onDelete: 'cascade' }),
    uri: text('uri').notNull(),
})

export const chatAttachmentsRelations = relations(chatAttachments, ({ one }) => ({
    entry: one(chatEntries, {
        fields: [chatAttachments.entry_id],
        references: [chatEntries.id],
    }),
}))

export const lorebooks = sqliteTable('lorebooks', {
    id: integer('id', { mode: 'number' }).primaryKey().notNull(),
    name: text('name').notNull(),
})

export const lorebook_entries = sqliteTable('lorebook_entries', {
    id: integer('id', { mode: 'number' }).primaryKey().notNull(),
    lorebook_id: integer('lorebook_id', { mode: 'number' })
        .notNull()
        .references(() => lorebooks.id, { onDelete: 'cascade' }),
    keys: text('keys').notNull().default(''),
    content: text('content').notNull().default(''),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    case_sensitive: integer('case_sensitive', { mode: 'boolean' }).notNull().default(false),
    constant: integer('constant', { mode: 'boolean' }).notNull().default(false),
    selective: integer('selective', { mode: 'boolean' }).notNull().default(false),
    insertion_order: integer('insertion_order', { mode: 'number' }).notNull().default(100),
})

export const characterLorebooks = sqliteTable(
    'character_lorebooks',
    {
        character_id: integer('character_id', { mode: 'number' })
            .notNull()
            .references(() => characters.id, { onDelete: 'cascade' }),
        lorebook_id: integer('lorebook_id', { mode: 'number' })
            .notNull()
            .references(() => lorebooks.id, { onDelete: 'cascade' }),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.character_id, table.lorebook_id] }),
    })
)

export const lorebookRelations = relations(lorebooks, ({ many }) => ({
    entries: many(lorebook_entries),
    characters: many(characterLorebooks),
}))

export const lorebookEntryRelations = relations(lorebook_entries, ({ one }) => ({
    lorebook: one(lorebooks, {
        fields: [lorebook_entries.lorebook_id],
        references: [lorebooks.id],
    }),
}))

export const characterLorebookRelations = relations(characterLorebooks, ({ one }) => ({
    character: one(characters, {
        fields: [characterLorebooks.character_id],
        references: [characters.id],
    }),
    lorebook: one(lorebooks, {
        fields: [characterLorebooks.lorebook_id],
        references: [lorebooks.id],
    }),
}))
