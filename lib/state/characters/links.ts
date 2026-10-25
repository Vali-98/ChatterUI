import { and, eq } from 'drizzle-orm'

import { db as database } from '@db/db'
import { characterLinks, type LinkType } from '@db/schema'

type CharacterLinkInput = Pick<typeof characterLinks.$inferInsert, 'type' | 'value'>

export namespace CharacterLinks {
    namespace query {
        export const links = async (characterId: number) => await live.links(characterId)
    }

    namespace live {
        export const links = (characterId: number) =>
            database.query.characterLinks.findMany({
                where: eq(characterLinks.character_id, characterId),
            })
    }

    namespace upsert {
        export const link = async (characterId: number, { type, value }: CharacterLinkInput) => {
            await database
                .insert(characterLinks)
                .values({ character_id: characterId, type: type, value: value })
                .onConflictDoUpdate({
                    target: [characterLinks.character_id, characterLinks.type],
                    set: { value },
                })
        }
    }

    namespace remove {
        export const link = async (characterLinkId: number) => {
            await database.delete(characterLinks).where(eq(characterLinks.id, characterLinkId))
        }

        export const linkByType = async (characterId: number, type: LinkType) => {
            await database
                .delete(characterLinks)
                .where(
                    and(eq(characterLinks.character_id, characterId), eq(characterLinks.type, type))
                )
        }

        export const linksByTarget = async ({ type, value }: CharacterLinkInput) => {
            await database
                .delete(characterLinks)
                .where(and(eq(characterLinks.value, value), eq(characterLinks.type, type)))
        }
    }

    export const db = { query: query, live: live, upsert: upsert, delete: remove }
}
