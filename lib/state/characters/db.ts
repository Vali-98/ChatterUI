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

import { createBlankV2Card } from './schema'
import type { CharacterCardV2 } from './schema'
import type { CharacterCardData } from './types'

export namespace db {
    export namespace query {
        export const cardQuery = (charId: number) => {
            return database.query.characters.findFirst({
                where: eq(characters.id, charId),
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

        export const card = async (charId: number): Promise<CharacterCardData | undefined> => {
            const data = await cardQuery(charId)
            return data
        }

        export const cardList = async (
            type: 'character' | 'user',
            orderBy: 'id' | 'modified' = 'id'
        ) => {
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
                orderBy: orderBy === 'id' ? characters.id : desc(characters.last_modified),
            })

            return query.map((item) => ({
                ...item,
                latestChat: item.chats[0]?.id,
                latestSwipe: item.chats[0]?.messages[0]?.swipes[0]?.swipe,
                latestName: item.chats[0]?.messages[0]?.name,
                last_modified: item.last_modified ?? 0,
                tags: item.tags.map((item) => item.tag.tag),
            }))
        }

        export const cardListQuery = (
            type: 'character' | 'user',
            orderBy: 'id' | 'modified' = 'id'
        ) => {
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
                orderBy: orderBy === 'id' ? characters.id : desc(characters.last_modified),
            })
        }

        export const cardListQueryWindow = (
            type: 'character' | 'user',
            orderBy: 'name' | 'modified' = 'modified',
            direction: 'desc' | 'asc' = 'desc',
            limit = 20,
            offset = 0,
            searchFilter: string = '',
            searchTags: string[] = [],
            hiddenTags: string[] = []
        ) => {
            const dir = direction === 'asc' ? asc : desc
            return database.query.characters.findMany({
                columns: {
                    id: true,
                    name: true,
                    image_id: true,
                    last_modified: true,
                },
                where: (characters) => {
                    const base = eq(characters.type, type)
                    const search = searchFilter
                        ? like(characters.name, `%${searchFilter.trim().toLocaleLowerCase()}%`)
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
                        searchTags.length > 0
                            ? gte(
                                  database
                                      .select({ count: sql<number>`count(*)` })
                                      .from(characterTags)
                                      .innerJoin(tags, eq(characterTags.tag_id, tags.id))
                                      .where(
                                          and(
                                              eq(characterTags.character_id, characters.id),
                                              inArray(tags.tag, searchTags)
                                          )
                                      ),
                                  searchTags.length
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
                orderBy: orderBy === 'name' ? dir(characters.name) : dir(characters.last_modified),
                limit: limit,
                offset: offset,
            })
        }

        export const cardExists = async (charId: number) => {
            return await database.query.characters.findFirst({
                where: eq(characters.id, charId),
            })
        }

        export const backgroundImageQuery = (charId: number) => {
            return database.query.characters.findFirst({
                where: eq(characters.id, charId),
                columns: { background_image: true },
            })
        }
    }

    export namespace mutate {
        export const createCard = async (
            name: string,
            type: 'user' | 'character' = 'character'
        ) => {
            const { data } = createBlankV2Card(name)

            const [{ id }] = await database
                .insert(characters)
                .values({ ...data, type: type })
                .returning({ id: characters.id })
            return id
        }

        export const updateCard = async (card: CharacterCardData, cardID: number) => {
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
                    .where(eq(characters.id, cardID))
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
                    const currentTagIDs = card.tags
                        .filter((item) => item.tag_id !== -1)
                        .map((item) => ({
                            character_id: card.id,
                            tag_id: item.tag.id,
                        }))
                    const newTagIDs: (typeof characterTags.$inferSelect)[] = []

                    // optimistically add missing tags
                    if (newTags.length !== 0) {
                        await database
                            .insert(tags)
                            .values(newTags)
                            .onConflictDoNothing()
                            .returning({
                                id: tags.id,
                            })
                            // concat new tags to tagids
                            .then((result) => {
                                newTagIDs.push(
                                    ...result.map((item) => ({
                                        character_id: card.id,
                                        tag_id: item.id,
                                    }))
                                )
                            })
                    }
                    const mergedTags = [...currentTagIDs, ...newTagIDs]
                    if (mergedTags.length !== 0)
                        await database
                            .insert(characterTags)
                            .values(mergedTags)
                            .onConflictDoNothing()

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
                                database
                                    .select({ tag_id: characterTags.tag_id })
                                    .from(characterTags)
                            )
                        )
                }
            } catch (e) {
                Logger.warn(`${e}`)
            }
        }

        export const addAltGreeting = async (charId: number) => {
            const [{ id }] = await database
                .insert(characterGreetings)
                .values({
                    character_id: charId,
                    greeting: '',
                })
                .returning({ id: characterGreetings.id })
            return id
        }

        export const deleteAltGreeting = async (altGreetingId: number) => {
            await database
                .delete(characterGreetings)
                .where(eq(characterGreetings.id, altGreetingId))
        }

        // TODO: Proper per field updates, though not that expensive
        export const updateCardField = async (
            field: keyof NonNullable<CharacterCardData>,
            data: any,
            charId: number
        ) => {
            if (field === 'alternate_greetings') {
                // find greetings and update
                Logger.warn('ALT GREETINGS MODIFICATION NOT IMPLEMENTED')
                return
            }
            await database
                .update(characters)
                .set({ [field]: data })
                .where(eq(characters.id, charId))
        }

        export const deleteCard = async (charID: number) => {
            await database.delete(characters).where(eq(characters.id, charID))
            await database
                .delete(tags)
                .where(
                    notInArray(
                        tags.id,
                        database.select({ tag_id: characterTags.tag_id }).from(characterTags)
                    )
                )
        }

        export const updateModified = async (charID: number) => {
            await database
                .update(characters)
                .set({ last_modified: Date.now() })
                .where(eq(characters.id, charID))
        }

        export const createCharacter = async (
            card: CharacterCardV2,
            type: 'character' | 'user' = 'character',
            imageId?: number
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

                    const greetingdata =
                        typeof data?.alternate_greetings === 'object'
                            ? (data?.alternate_greetings?.map((item) => ({
                                  character_id: id,
                                  greeting: item,
                              })) ?? [])
                            : []
                    if (greetingdata.length > 0)
                        for (const greeting of greetingdata)
                            await tx.insert(characterGreetings).values(greeting)

                    if (data.tags && data?.tags?.length !== 0) {
                        const tagsdata = data.tags.map((tag) => ({ tag: tag }))
                        for (const tag of tagsdata)
                            await tx.insert(tags).values(tag).onConflictDoNothing()

                        const tagids = (
                            await tx.query.tags.findMany({
                                where: inArray(tags.tag, data.tags),
                            })
                        ).map((item) => ({
                            character_id: id,
                            tag_id: item.id,
                        }))
                        await tx.insert(characterTags).values(tagids).onConflictDoNothing()
                    }
                    return { id, image_id }
                } catch (error) {
                    Logger.errorToast(
                        t('common.errors.rollingBackDueToError'),
                        JSON.stringify(error)
                    )
                    tx.rollback()
                    return undefined
                }
            })
            return created
        }

        export const updateBackground = async (charId: number, imageURI: number) => {
            await database
                .update(characters)
                .set({ background_image: imageURI })
                .where(eq(characters.id, charId))
        }

        export const deleteBackground = async (charId: number) => {
            await database
                .update(characters)
                .set({ background_image: null })
                .where(eq(characters.id, charId))
        }

        export const deleteImage = async (charId: number) => {
            await database.update(characters).set({ image_id: -1 }).where(eq(characters.id, charId))
        }
    }

    export namespace live {
        export const listSimple = (type: 'character' | 'user') => {
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
}
