import { and, eq, isNull, SQL } from 'drizzle-orm'
import { unionAll } from 'drizzle-orm/sqlite-core'

import { db as database } from '@db/db'
import { authorNotes } from '@db/schema'

export type AuthorNote = typeof authorNotes.$inferSelect
export type AuthorNoteParams = Partial<Omit<AuthorNote, 'id'>>
export enum NoteType {
    GLOBAL,
    CHARACTER,
    CHAT,
}

export namespace AuthorNotes {
    export namespace db {
        export namespace query {
            export const getActiveNotes = async (charId: number, chatId: number) => {
                const activeChat = database
                    .select()
                    .from(authorNotes)
                    .where(and(eq(authorNotes.chat_id, chatId), eq(authorNotes.active, true)))
                const activeCharacter = database
                    .select()
                    .from(authorNotes)
                    .where(and(eq(authorNotes.character_id, charId), eq(authorNotes.active, true)))
                const activeGlobal = database
                    .select()
                    .from(authorNotes)
                    .where(
                        and(
                            eq(authorNotes.active, true),
                            isNull(authorNotes.character_id),
                            isNull(authorNotes.chat_id)
                        )
                    )

                const result = await unionAll(activeChat, activeCharacter, activeGlobal)
                return result
            }
        }
        export namespace mutate {
            export const createNote = async (params: AuthorNoteParams = {}) => {
                const [{ id }] = await database
                    .insert(authorNotes)
                    .values(params)
                    .returning({ id: authorNotes.id })
                return id
            }

            export const deleteNote = async (noteId: number) => {
                await database.delete(authorNotes).where(eq(authorNotes.id, noteId))
            }

            export const updateNote = async (noteId: number, params: AuthorNoteParams = {}) => {
                await database.update(authorNotes).set(params).where(eq(authorNotes.id, noteId))
            }
        }
        export namespace live {
            const queryMap: Record<
                NoteType,
                (chatId: number, characterId: number) => SQL | undefined
            > = {
                [NoteType.GLOBAL]: () =>
                    and(isNull(authorNotes.character_id), isNull(authorNotes.chat_id)),
                [NoteType.CHARACTER]: (x, characterId) => eq(authorNotes.character_id, characterId),
                [NoteType.CHAT]: (chatId, x) => eq(authorNotes.chat_id, chatId),
            }

            export const noteIds = (type: NoteType, chatId: number, characterId: number) => {
                const whereQuery = queryMap[type]
                return database
                    .select({
                        id: authorNotes.id,
                    })
                    .from(authorNotes)
                    .where(whereQuery(chatId, characterId))
                    .orderBy(authorNotes.id)
            }

            export const note = (noteId: number) => {
                return database
                    .select()
                    .from(authorNotes)
                    .where(eq(authorNotes.id, noteId))
                    .limit(1)
            }

            export const chatNoteIds = (chatId: number) => {
                return database
                    .select({
                        id: authorNotes.id,
                    })
                    .from(authorNotes)
                    .where(eq(authorNotes.chat_id, chatId))
            }

            export const characterNotes = (charId: number) => {
                return database
                    .select({ id: authorNotes.id })
                    .from(authorNotes)
                    .where(eq(authorNotes.character_id, charId))
            }
            export const globalNotes = () => {
                return database
                    .select({ id: authorNotes.id })
                    .from(authorNotes)
                    .where(and(isNull(authorNotes.character_id), isNull(authorNotes.chat_id)))
            }
        }
    }
}
