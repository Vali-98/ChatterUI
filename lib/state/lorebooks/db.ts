import { and, eq, like } from 'drizzle-orm'

import { db as database } from '@db/db'
import { lorebookEntries, lorebooks, LorebookType } from '@db/schema'

import { LorebookImport } from './schema'

export namespace db {
    export namespace query {
        export const lorebookEntryList = (id: number) => {
            return database.query.lorebookEntries.findMany({
                where: eq(lorebookEntries.lorebook_id, id),
            })
        }

        export const lorebookInfo = async (id: number) => {
            return await database.query.lorebooks.findFirst({ where: eq(lorebooks.id, id) })
        }

        export const activeLorebooks = async () => {
            return await database.query.lorebooks.findMany({
                where: eq(lorebooks.active, true),
            })
        }
    }

    export namespace mutate {
        export const importFromJSON = async (lorebook: LorebookImport) => {
            const { entries, ...lorebookRest } = lorebook
            const [{ lorebookId }] = await database
                .insert(lorebooks)
                .values([{ ...lorebookRest, active: true }])
                .returning({ lorebookId: lorebooks.id })

            await database
                .insert(lorebookEntries)
                .values(entries.map((entry) => ({ ...entry, lorebook_id: lorebookId })))
        }

        export const deleteLorebook = async (id: number) => {
            await database.delete(lorebooks).where(eq(lorebooks.id, id))
        }

        export const updateLorebookInfo = async (
            id: number,
            lorebook: Partial<Omit<LorebookType, 'id'>>
        ) => {
            await database.update(lorebooks).set(lorebook).where(eq(lorebooks.id, id))
        }

        export const updateLorebookEntry = async (
            id: number,
            entry: Partial<Omit<typeof lorebookEntries.$inferInsert, 'id' | 'lorebook_id'>>
        ) => {
            await database.update(lorebookEntries).set(entry).where(eq(lorebookEntries.id, id))
        }

        export const deleteLorebookEntry = async (id: number) => {
            await database.delete(lorebookEntries).where(eq(lorebookEntries.id, id))
        }
    }

    export namespace live {
        export const lorebookList = () => {
            return database.query.lorebooks.findMany()
        }

        export const lorebookInfo = (id: number) => {
            return database.query.lorebooks.findFirst({ where: eq(lorebooks.id, id) })
        }

        export const lorebook = (id: number) => {
            return database.query.lorebooks.findFirst({
                where: eq(lorebookEntries.lorebook_id, id),
            })
        }

        export const lorebookEntryList = (id: number) => {
            return database.query.lorebookEntries.findMany({
                where: eq(lorebookEntries.lorebook_id, id),
            })
        }

        export const lorebookEntryNameList = (id: number, query?: string) => {
            const searchQuery =
                query && query.length > 1 ? like(lorebookEntries.name, `%${query}%`) : undefined
            return database.query.lorebookEntries.findMany({
                where: and(eq(lorebookEntries.lorebook_id, id), searchQuery),
                columns: {
                    id: true,
                    name: true,
                },
            })
        }

        export const lorebookEntry = (id: number) => {
            return database.query.lorebookEntries.findFirst({ where: eq(lorebookEntries.id, id) })
        }
    }
}
