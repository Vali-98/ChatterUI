import { and, eq } from 'drizzle-orm'

import { db as database } from '@db/db'
import { characterLinks, LinkType } from '@db/schema'

export namespace CharacterLink {
    export namespace db {
        export namespace query {
            export const links = async (character_id: number) => {
                const results = await database.query.characterLinks.findMany({
                    where: eq(characterLinks.id, character_id),
                })
                return results
            }
        }

        export namespace mutate {
            export const upsert = async (character_id: number, type: LinkType, value: number) => {
                await database
                    .insert(characterLinks)
                    .values({ character_id, type, value })
                    .onConflictDoUpdate({
                        target: [characterLinks.character_id, characterLinks.type],
                        set: { value },
                    })
            }

            export const deleteById = async (id: number) => {
                await database.delete(characterLinks).where(eq(characterLinks.id, id))
            }

            export const deleteByCharacterId = async (character_id: number, type: LinkType) => {
                await database
                    .delete(characterLinks)
                    .where(
                        and(
                            eq(characterLinks.character_id, character_id),
                            eq(characterLinks.type, type)
                        )
                    )
            }

            export const deleteByValue = async (type: LinkType, value: number) => {
                await database
                    .delete(characterLinks)
                    .where(and(eq(characterLinks.value, value), eq(characterLinks.type, type)))
            }
        }

        export namespace live {
            export const links = (character_id: number) => {
                return database.query.characterLinks.findMany({
                    where: eq(characterLinks.character_id, character_id),
                })
            }
        }
    }
}
