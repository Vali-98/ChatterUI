import { and, asc, desc, eq, gte, inArray, like, notExists, notInArray, sql } from 'drizzle-orm'
import { t } from 'i18next'

import { db as database } from '@db/db'
import {
    characterGreetings,
    characterTags,
    characters,
    chatEntries,
    chatSwipes,
    chats,
    tags,
} from '@db/schema'
import { Logger } from '@lib/state/Logger'

import { buildBlankCharacterCard } from './schema'
import type { CharacterCardV2 } from './schema'
import type {
    CharacterCard,
    CharacterCardType,
    CharacterCardListOptions,
    CharacterCardListPageOptions,
    CreateCardDatabaseOptions,
    CharacterCardChanges,
} from './types'

namespace query {
    export const card = async (characterId: number): Promise<CharacterCard | undefined> => {
        const data = await live.card(characterId)
        return data
    }

    export const cardList = async ({
        type = 'character',
        sortBy = 'id',
    }: CharacterCardListOptions = {}) => {
        const query = await database.query.characters.findMany({
            columns: {
                id: true,
                name: true,
                image_id: true,
                last_modified: true,
            },
            with: {
                tags: {
                    columns: {
                        character_id: false,
                    },
                    with: {
                        tag: true,
                    },
                },
                chats: {
                    columns: {
                        id: true,
                    },
                    limit: 1,
                    orderBy: desc(chats.last_modified),
                    with: {
                        messages: {
                            columns: {
                                id: true,
                                name: true,
                            },
                            limit: 1,
                            orderBy: desc(chatEntries.id),
                            with: {
                                swipes: {
                                    columns: {
                                        swipe: true,
                                    },
                                    orderBy: desc(chatSwipes.id),
                                    limit: 1,
                                },
                            },
                        },
                    },
                },
            },
            where: (characters, { eq }) => eq(characters.type, type),
            orderBy: sortBy === 'id' ? characters.id : desc(characters.last_modified),
        })

        return query.map((item) => ({
            ...item,
            latestChatId: item.chats[0]?.id,
            latestSwipeText: item.chats[0]?.messages[0]?.swipes[0]?.swipe,
            latestMessageName: item.chats[0]?.messages[0]?.name,
            last_modified: item.last_modified ?? 0,
            tags: item.tags.map((item) => item.tag.tag),
        }))
    }

    export const cardRow = async (characterId: number) => {
        return await database.query.characters.findFirst({
            where: eq(characters.id, characterId),
        })
    }
}

namespace live {
    export const card = (characterId: number) => {
        return database.query.characters.findFirst({
            where: eq(characters.id, characterId),
            with: {
                tags: {
                    columns: {
                        character_id: false,
                    },
                    with: {
                        tag: true,
                    },
                },
                alternate_greetings: true,
                links: true,
            },
        })
    }

    export const cardList = ({
        type = 'character',
        sortBy = 'id',
    }: CharacterCardListOptions = {}) => {
        return database.query.characters.findMany({
            columns: {
                id: true,
                name: true,
                image_id: true,
                last_modified: true,
            },
            with: {
                tags: {
                    columns: {
                        character_id: false,
                    },
                    with: {
                        tag: true,
                    },
                },
                chats: {
                    columns: {
                        id: true,
                    },
                    limit: 1,
                    orderBy: desc(chats.last_modified),
                    with: {
                        messages: {
                            columns: {
                                id: true,
                                name: true,
                            },
                            limit: 1,
                            orderBy: desc(chatEntries.id),
                            with: {
                                swipes: {
                                    columns: {
                                        swipe: true,
                                    },
                                    orderBy: desc(chatSwipes.id),
                                    limit: 1,
                                },
                            },
                        },
                    },
                },
            },
            where: (characters, { eq }) => eq(characters.type, type),
            orderBy: sortBy === 'id' ? characters.id : desc(characters.last_modified),
        })
    }

    export const cardListWindow = ({
        type = 'character',
        sortBy = 'modified',
        sortDirection = 'desc',
        limit = 20,
        offset = 0,
        searchText = '',
        includedTags = [],
        hiddenTags = [],
    }: CharacterCardListPageOptions = {}) => {
        const sort = sortDirection === 'asc' ? asc : desc
        return database.query.characters.findMany({
            columns: {
                id: true,
                name: true,
                image_id: true,
                last_modified: true,
            },
            where: (characters) => {
                const base = eq(characters.type, type)
                const search = searchText
                    ? like(characters.name, `%${searchText.trim().toLocaleLowerCase()}%`)
                    : undefined
                const hidden =
                    hiddenTags.length > 0
                        ? notExists(
                              database
                                  .select()
                                  .from(characterTags)
                                  .innerJoin(tags, eq(characterTags.tag_id, tags.id))
                                  .where(
                                      and(
                                          eq(characterTags.character_id, characters.id),
                                          inArray(tags.tag, hiddenTags)
                                      )
                                  )
                          )
                        : undefined
                const filteredTags =
                    includedTags.length > 0
                        ? gte(
                              database
                                  .select({ count: sql<number>`count(*)` })
                                  .from(characterTags)
                                  .innerJoin(tags, eq(characterTags.tag_id, tags.id))
                                  .where(
                                      and(
                                          eq(characterTags.character_id, characters.id),
                                          inArray(tags.tag, includedTags)
                                      )
                                  ),
                              includedTags.length
                          )
                        : undefined

                return and(base, search, hidden, filteredTags)
            },
            with: {
                tags: {
                    columns: {},
                    with: {
                        tag: true,
                    },
                },
                chats: {
                    columns: {
                        id: true,
                    },
                    limit: 1,
                    orderBy: desc(chats.last_modified),
                    with: {
                        messages: {
                            columns: {
                                id: true,
                                name: true,
                            },
                            limit: 1,
                            orderBy: desc(chatEntries.id),
                            with: {
                                swipes: {
                                    columns: {
                                        swipe: true,
                                    },
                                    orderBy: desc(chatSwipes.id),
                                    limit: 1,
                                },
                            },
                        },
                    },
                },
                links: true,
            },
            orderBy: sortBy === 'name' ? sort(characters.name) : sort(characters.last_modified),
            limit: limit,
            offset: offset,
        })
    }

    export const backgroundImage = (characterId: number) => {
        return database.query.characters.findFirst({
            where: eq(characters.id, characterId),
            columns: { background_image: true },
        })
    }

    export const cardSummaries = ({ type = 'character' }: { type?: CharacterCardType } = {}) => {
        return database.query.characters.findMany({
            columns: {
                id: true,
                name: true,
                image_id: true,
                last_modified: true,
            },
            where: (characters, { eq }) => eq(characters.type, type),
            orderBy: characters.id,
        })
    }
}

namespace create {
    export const blankCard = async (
        name: string,
        { type = 'character' }: { type?: CharacterCardType } = {}
    ) => {
        const { data } = buildBlankCharacterCard(name)

        const [{ id }] = await database
            .insert(characters)
            .values({ ...data, type: type })
            .returning({ id: characters.id })
        return id
    }

    export const alternateGreeting = async (characterId: number) => {
        const [{ id }] = await database
            .insert(characterGreetings)
            .values({
                character_id: characterId,
                greeting: '',
            })
            .returning({ id: characterGreetings.id })
        return id
    }

    export const card = async (
        card: CharacterCardV2,
        { type = 'character', image_id: imageId }: CreateCardDatabaseOptions = {}
    ) => {
        const { data } = card
        const created = await database.transaction(async (tx) => {
            try {
                const [{ id, image_id }] = await tx
                    .insert(characters)
                    .values({
                        ...data,
                        type: type,
                        ...(imageId !== undefined && { image_id: imageId }),
                    })
                    .returning({ id: characters.id, image_id: characters.image_id })

                const greetingRows =
                    typeof data?.alternate_greetings === 'object'
                        ? (data?.alternate_greetings?.map((item) => ({
                              character_id: id,
                              greeting: item,
                          })) ?? [])
                        : []
                if (greetingRows.length > 0)
                    for (const greeting of greetingRows)
                        await tx.insert(characterGreetings).values(greeting)

                if (data.tags && data?.tags?.length !== 0) {
                    const tagRows = data.tags.map((tag) => ({ tag: tag }))
                    for (const tag of tagRows)
                        await tx.insert(tags).values(tag).onConflictDoNothing()

                    const characterTagRows = (
                        await tx.query.tags.findMany({
                            where: inArray(tags.tag, data.tags),
                        })
                    ).map((item) => ({
                        character_id: id,
                        tag_id: item.id,
                    }))
                    await tx.insert(characterTags).values(characterTagRows).onConflictDoNothing()
                }
                return { id, image_id }
            } catch (error) {
                Logger.errorToast(t('common.errors.rollingBackDueToError'), JSON.stringify(error))
                tx.rollback()
                return undefined
            }
        })
        return created
    }
}

namespace update {
    export const card = async (characterId: number, card: CharacterCard) => {
        if (!card) return

        try {
            await database
                .update(characters)
                .set({
                    description: card.description,
                    first_mes: card.first_mes,
                    name: card.name,
                    personality: card.personality,
                    scenario: card.scenario,
                    mes_example: card.mes_example,
                })
                .where(eq(characters.id, characterId))
            await Promise.all(
                card.alternate_greetings.map(async (item) => {
                    await database
                        .update(characterGreetings)
                        .set({ greeting: item.greeting })
                        .where(eq(characterGreetings.id, item.id))
                })
            )
            if (card.tags) {
                // create { tag: string }[]
                const newTags = card.tags
                    .filter((item) => item.tag_id === -1)
                    .map((tag) => ({ tag: tag.tag.tag }))

                // New tags are marked with -1
                const currentCharacterTags = card.tags
                    .filter((item) => item.tag_id !== -1)
                    .map((item) => ({
                        character_id: card.id,
                        tag_id: item.tag.id,
                    }))
                const newCharacterTags: (typeof characterTags.$inferSelect)[] = []

                // optimistically add missing tags
                if (newTags.length !== 0) {
                    await database
                        .insert(tags)
                        .values(newTags)
                        .onConflictDoNothing()
                        .returning({
                            id: tags.id,
                        })
                        // concat new tags to characterTagRows
                        .then((result) => {
                            newCharacterTags.push(
                                ...result.map((item) => ({
                                    character_id: card.id,
                                    tag_id: item.id,
                                }))
                            )
                        })
                }
                const mergedTags = [...currentCharacterTags, ...newCharacterTags]
                if (mergedTags.length !== 0)
                    await database.insert(characterTags).values(mergedTags).onConflictDoNothing()

                const ids = mergedTags.map((item) => item.tag_id)
                // delete orphaned characterTags

                await database
                    .delete(characterTags)
                    .where(
                        and(
                            notInArray(characterTags.tag_id, ids),
                            eq(characterTags.character_id, card.id)
                        )
                    )

                // delete orphaned tags
                await database
                    .delete(tags)
                    .where(
                        notInArray(
                            tags.id,
                            database.select({ tag_id: characterTags.tag_id }).from(characterTags)
                        )
                    )
            }
            return await query.card(characterId)
        } catch (e) {
            Logger.warn(`${e}`)
        }
    }

    export const cardFields = async (characterId: number, changes: CharacterCardChanges) => {
        await database.update(characters).set(changes).where(eq(characters.id, characterId))
    }

    export const cardTimestamp = async (characterId: number) => {
        await database
            .update(characters)
            .set({ last_modified: Date.now() })
            .where(eq(characters.id, characterId))
    }

    export const backgroundImageReference = async (characterId: number, imageId: number) => {
        await database
            .update(characters)
            .set({ background_image: imageId })
            .where(eq(characters.id, characterId))
    }
}

namespace remove {
    export const alternateGreeting = async (alternateGreetingId: number) => {
        await database
            .delete(characterGreetings)
            .where(eq(characterGreetings.id, alternateGreetingId))
    }

    export const card = async (characterId: number) => {
        await database.delete(characters).where(eq(characters.id, characterId))
        await database
            .delete(tags)
            .where(
                notInArray(
                    tags.id,
                    database.select({ tag_id: characterTags.tag_id }).from(characterTags)
                )
            )
    }

    export const backgroundImageReference = async (characterId: number) => {
        await database
            .update(characters)
            .set({ background_image: null })
            .where(eq(characters.id, characterId))
    }

    export const imageReference = async (characterId: number) => {
        await database
            .update(characters)
            .set({ image_id: -1 })
            .where(eq(characters.id, characterId))
    }
}

export type CharacterCardQuery = ReturnType<typeof live.card>

export const db = { query: query, live: live, create: create, update: update, delete: remove }
