import { db as database } from '@db'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { Storage } from '@lib/enums/Storage'
import {
    characterGreetings,
    characterTags,
    characters,
    chatEntries,
    chatSwipes,
    chats,
    tags,
} from 'db/schema'
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { randomUUID } from 'expo-crypto'
import * as DocumentPicker from 'expo-document-picker'
import * as FS from 'expo-file-system'
import { useEffect } from 'react'
import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { Logger } from './Logger'
import { mmkvStorage } from '../storage/MMKV'
import { getPngChunkText } from '../utils/PNG'
import { Asset } from 'expo-asset'

export type CharInfo = {
    name: string
    id: number
    image_id: number
    last_modified: number
    tags: string[]
    latestSwipe?: string
    latestName?: string
    latestChat?: number
}

type CharacterTokenCache = {
    otherName: string
    description_length: number
    examples_length: number
    personality_length: number
    scenario_length: number
}

type CharacterCardState = {
    card?: CharacterCardData
    tokenCache: CharacterTokenCache | undefined
    id: number | undefined
    updateCard: (card: CharacterCardData) => void
    setCard: (id: number) => Promise<string | undefined>
    unloadCard: () => void
    getImage: () => string
    updateImage: (sourceURI: string) => void
    getCache: (otherName: string) => CharacterTokenCache
}

export type CharacterCardData = Awaited<ReturnType<typeof Characters.db.query.cardQuery>>

export namespace Characters {
    export const useUserCard = create<CharacterCardState>()(
        persist(
            (set, get) => ({
                id: undefined,
                card: undefined,
                tokenCache: undefined,
                setCard: async (id: number) => {
                    const card = await db.query.card(id)
                    if (card)
                        set((state) => ({ ...state, card: card, id: id, tokenCache: undefined }))
                    return card?.name
                },
                unloadCard: () => {
                    set((state) => ({
                        ...state,
                        id: undefined,
                        card: undefined,
                        tokenCache: undefined,
                    }))
                },
                updateCard: (card: CharacterCardData) => {
                    set((state) => ({ ...state, card: card }))
                },
                getImage: () => {
                    return getImageDir(get().card?.image_id ?? 0)
                },
                updateImage: async (sourceURI: string) => {
                    const id = get().id
                    const oldImageID = get().card?.image_id
                    const card = get().card
                    if (!id || !oldImageID || !card) {
                        Logger.errorToast('Could not get data, something very wrong has happened!')
                        return
                    }
                    const imageID = Date.now()
                    await db.mutate.updateCardField('image_id', imageID, id)
                    await deleteImage(oldImageID)
                    await copyImage(sourceURI, imageID)
                    card.image_id = imageID
                    set((state) => ({ ...state, card: card }))
                },
                getCache: (userName: string) => {
                    const cache = get().tokenCache
                    if (cache && cache?.otherName === userName) return cache

                    const card = get().card
                    if (!card)
                        return {
                            otherName: userName,
                            description_length: 0,
                            examples_length: 0,
                            personality_length: 0,
                            scenario_length: 0,
                        }
                    const description = replaceMacros(card.description)
                    const examples = replaceMacros(card.mes_example)
                    const personality = replaceMacros(card.personality)
                    const scenario = replaceMacros(card.scenario)

                    const getTokenCount = Tokenizer.getTokenizer()

                    const newCache: CharacterTokenCache = {
                        otherName: userName,
                        description_length: getTokenCount(description),
                        examples_length: getTokenCount(examples),
                        personality_length: getTokenCount(personality),
                        scenario_length: getTokenCount(scenario),
                    }

                    set((state) => ({ ...state, tokenCache: newCache }))
                    return newCache
                },
            }),
            {
                name: Storage.UserCard,
                storage: createJSONStorage(() => mmkvStorage),
                version: 2,
                partialize: (state) => ({ id: state.id, card: state.card }),
                migrate: async (persistedState: any, version) => {
                    if (version === 1) {
                        // migration from CharacterCardV2 to CharacterCardData
                        Logger.info('Migrating User Store to v2')
                        persistedState.id = undefined
                        persistedState.card = undefined
                    }
                },
            }
        )
    )

    export const useCharacterCard = create<CharacterCardState>()((set, get) => ({
        id: undefined,
        card: undefined,
        tokenCache: undefined,
        setCard: async (id: number) => {
            const card = await db.query.card(id)
            set((state) => ({ ...state, card: card, id: id, tokenCache: undefined }))
            return card?.name
        },
        updateCard: (card: CharacterCardData) => {
            set((state) => ({ ...state, card: card }))
        },
        unloadCard: () => {
            set((state) => ({
                ...state,
                id: undefined,
                card: undefined,
                tokenCache: undefined,
            }))
        },
        getImage: () => {
            return getImageDir(get().card?.image_id ?? 0)
        },
        updateImage: async (sourceURI: string) => {
            const id = get().id
            const oldImageID = get().card?.image_id
            const card = get().card
            if (!id || !oldImageID || !card) {
                Logger.errorToast('Could not get data, something very wrong has happned!')
                return
            }
            const imageID = Date.now()
            await db.mutate.updateCardField('image_id', imageID, id)
            await deleteImage(oldImageID)
            await copyImage(sourceURI, imageID)
            card.image_id = imageID
            set((state) => ({ ...state, card: card }))
        },
        getCache: (charName: string) => {
            const cache = get().tokenCache
            const card = get().card
            if (cache?.otherName && cache.otherName === useUserCard.getState().card?.name)
                return cache

            if (!card)
                return {
                    otherName: charName,
                    description_length: 0,
                    examples_length: 0,
                    personality_length: 0,
                    scenario_length: 0,
                }
            const description = replaceMacros(card.description)
            const examples = replaceMacros(card.mes_example)
            const personality = replaceMacros(card.personality)
            const scenario = replaceMacros(card.scenario)

            const getTokenCount = Tokenizer.getTokenizer()

            const newCache = {
                otherName: charName,
                description_length: getTokenCount(description),
                examples_length: getTokenCount(examples),
                personality_length: getTokenCount(personality),
                scenario_length: getTokenCount(scenario),
            }
            set((state) => ({ ...state, tokenCache: newCache }))
            return newCache
        },
    }))

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

            export const cardExists = async (charId: number) => {
                return await database.query.characters.findFirst({
                    where: eq(characters.id, charId),
                })
            }
        }

        export namespace mutate {
            export const createCard = async (
                name: string,
                type: 'user' | 'character' = 'character'
            ) => {
                const { data } = createBlankV2Card(name)

                const [{ id }, ..._] = await database
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
                const [{ id }, ..._] = await database
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
                const data = await database.query.characters.findFirst({
                    where: eq(characters.id, charID),
                    columns: { image_id: true },
                })
                if (data) deleteImage(data.image_id)
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

            export const createCharacter = async (card: CharacterCardV2, imageuri: string = '') => {
                // TODO : Extract CharacterBook value to Lorebooks, CharacterLorebooks
                const { data } = card
                // provide warning ?
                // if (data.character_book) { console.log(warn) }
                const image_id = await database.transaction(async (tx) => {
                    try {
                        const [{ id, image_id }, ..._] = await tx
                            .insert(characters)
                            .values({
                                type: 'character',
                                ...data,
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
                        return image_id
                    } catch (error) {
                        Logger.errorToast(`Rolling back due to error: ` + error)
                        tx.rollback()
                        return undefined
                    }
                })
                if (image_id && imageuri) await copyImage(imageuri, image_id)
            }

            export const duplicateCard = async (charId: number) => {
                const card = await db.query.card(charId)

                if (!card) {
                    Logger.errorToast('Failed to copy card: Card does not exit')
                    return
                }
                const imageInfo = await FS.getInfoAsync(getImageDir(card.image_id))

                const cacheLoc = imageInfo.exists ? `${FS.cacheDirectory}${card.image_id}` : ''
                if (imageInfo.exists)
                    await FS.copyAsync({
                        from: getImageDir(card.image_id),
                        to: cacheLoc,
                    })
                const now = Date.now()
                card.last_modified = now
                card.image_id = now
                const cv2 = convertDBDataToCV2(card)
                if (!cv2) {
                    Logger.errorToast('Failed to copy card')
                    return
                }
                await createCharacter(cv2, cacheLoc)
                    .then(() => Logger.info(`Card cloned: ${card.name}`))
                    .catch((e) => Logger.info(`Failed to clone card: ${e}`))
            }
        }
    }

    export const deleteImage = async (imageID: number) => {
        await FS.deleteAsync(getImageDir(imageID), { idempotent: true })
    }

    export const copyImage = async (uri: string, imageID: number) => {
        await FS.copyAsync({
            from: uri,
            to: getImageDir(imageID),
        })
    }

    export const convertDBDataToCV2 = (data: NonNullable<CharacterCardData>): CharacterCardV2 => {
        const { id, ...rest } = data
        return {
            spec: 'chara_card_v2',
            spec_version: '2.0',
            data: {
                ...rest,
                tags: rest.tags.map((item) => item.tag.tag),
                alternate_greetings: rest.alternate_greetings.map((item) => item.greeting),
            },
        }
    }

    export const createCharacterFromImage = async (uri: string) => {
        const file = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 })
        if (!file) {
            Logger.errorToast(`Failed to create card - Image could not be retrieved`)
            return
        }

        const card = getPngChunkText(file)

        if (card === undefined) {
            Logger.errorToast('No character was found.')
            return
        }

        await createCharacterFromV2JSON(card, uri)
    }

    const createCharacterFromV1JSON = async (data: any, uri: string | undefined = undefined) => {
        const result = characterCardV1Schema.safeParse(data)
        if (result.error) {
            Logger.errorToast('Invalid Character Card')
            return
        }
        const converted = createBlankV2Card(result.data.name, result.data)

        Logger.info(`Creating new character: ${result.data.name}`)
        return db.mutate.createCharacter(converted, uri)
    }

    const createCharacterFromV2JSON = async (data: any, uri: string | undefined = undefined) => {
        // check JSON def
        const result = characterCardV2Schema.safeParse(data)
        if (result.error) {
            Logger.warnToast('V2 Parsing failed, falling back to V1')
            return await createCharacterFromV1JSON(data, uri)
        }

        Logger.info(`Creating new character: ${result.data.data.name}`)
        return await db.mutate.createCharacter(result.data, uri)
    }

    export const importCharacter = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: ['image/*', 'application/json'],
            multiple: true,
        })
        if (result.canceled) return
        result.assets.map(async (item) => {
            const isPNG = item.mimeType?.includes('image/')
            const isJSON = item.mimeType?.includes('application/json')
            try {
                if (isJSON) {
                    const data = await FS.readAsStringAsync(item.uri)
                    await createCharacterFromV2JSON(JSON.parse(data))
                }

                if (isPNG) await createCharacterFromImage(item.uri)
            } catch (e) {
                Logger.error(`Failed to create card from '${item.name}': ${e}`)
            }
        })
    }

    export const importCharacterFromChub = async (character_id: string) => {
        Logger.infoToast(`Importing character from Chub: ${character_id}`)
        try {
            const res = await fetch('https://api.chub.ai/api/characters/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    format: 'tavern',
                    fullPath: character_id,
                }),
            })
            const data = await res.arrayBuffer()
            const dataArray = new Uint8Array(data)
            let binaryString = ''
            dataArray.forEach((byte) => (binaryString += String.fromCharCode(byte)))
            const cardCacheDir = `${FS.cacheDirectory}${randomUUID()}.png`
            await FS.writeAsStringAsync(cardCacheDir, btoa(binaryString), { encoding: 'base64' })
            return createCharacterFromImage(cardCacheDir)
        } catch (error) {
            Logger.error(`Could not retreive card. ${error}`)
        }
    }

    export const importCharacterFromPyg = async (character_id: string) => {
        Logger.infoToast(`Loading from Pygmalion with id: ${character_id}`)

        const query = await fetch(
            `https://server.pygmalion.chat/api/export/character/${character_id}/v2`,
            {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }
        )
        if (query.status !== 200) {
            Logger.errorToast(`Failed to retrieve card from Pygmalion: ${query.status}`)
            return
        }

        const { character } = await query.json()

        const res = await fetch(character.data.avatar, {
            method: 'GET',
        })
        const data = await res.arrayBuffer()
        const dataArray = new Uint8Array(data)
        let binaryString = ''
        dataArray.forEach((byte) => (binaryString += String.fromCharCode(byte)))
        const uuid = randomUUID()

        const cardCacheDir = `${FS.cacheDirectory}${randomUUID()}.png`
        await FS.writeAsStringAsync(cardCacheDir, btoa(binaryString), { encoding: 'base64' })
        await db.mutate.createCharacter(character, `${FS.cacheDirectory}${uuid}.png`)
        Logger.info('Imported Character: ' + character.data.name)
    }

    export const importCharacterFromRemote = async (text: string) => {
        // UUID standard RFC 4122, only used by pyg for now
        const uuidRegex =
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

        if (uuidRegex.test(text)) {
            return importCharacterFromPyg(text)
        }

        if (/^[^/]+\/[^/]+$/.test(text)) return importCharacterFromChub(text)

        const url = new URL(text)
        if (/pygmalion.chat/.test(url.hostname)) {
            const param = new URLSearchParams(text)
            const character_id = param.get('id')?.replaceAll(`"`, '')
            const path = url.pathname.replace('/character/', '')
            if (character_id) return importCharacterFromPyg(character_id)
            else if (uuidRegex.test(path)) return importCharacterFromPyg(path)
            else {
                Logger.errorToast(`Failed to get id from Pygmalion URL`)
                return
            }
        }

        if (/chub.ai|characterhub.org/.test(url.hostname)) {
            const path = url.pathname.replace('/characters/', '')
            if (/^[^/]+\/[^/]+$/.test(path)) return importCharacterFromChub(path)
            else {
                Logger.errorToast(`Failed to get id from Chub URL`)
                return
            }
        }

        // Regex checks for format of [name][/][character]
        Logger.errorToast(`URL not recognized`)
    }

    export const getImageDir = (imageId: number) => {
        return `${FS.documentDirectory}characters/${imageId}.png`
    }

    export const createDefaultCard = async () => {
        const filename = 'aibot'
        const pngName = filename + '.png'
        const resName = filename + '.raw'
        const cardDefaultDir = `${FS.documentDirectory}appAssets/${pngName}`

        const fileinfo = await FS.getInfoAsync(cardDefaultDir)
        if (!fileinfo.exists) {
            const [asset] = await Asset.loadAsync(require('./../../assets/models/aibot.png'))
            await asset.downloadAsync()
            if (asset.localUri) await FS.copyAsync({ from: asset.localUri, to: cardDefaultDir })
        }
        await createCharacterFromImage(cardDefaultDir)
    }

    export const useCharacterUpdater = () => {
        const { id, updateCard } = useCharacterCard((state) => ({
            id: state.id,
            updateCard: state.updateCard,
        }))

        const { data } = useLiveQuery(db.query.cardQuery(id ?? -1))

        useEffect(() => {
            if (id && id === data?.id) {
                if (data) updateCard(data)
            }
        }, [data])
    }
}

const characterCardV1Schema = z.object({
    name: z.string(),
    description: z.string(),
    personality: z.string().catch(''),
    scenario: z.string().catch(''),
    first_mes: z.string().catch(''),
    mes_example: z.string().catch(''),
})

const characterCardV2DataSchema = z.object({
    name: z.string(),
    description: z.string().catch(''),
    personality: z.string().catch(''),
    scenario: z.string().catch(''),
    first_mes: z.string().catch(''),
    mes_example: z.string().catch(''),

    creator_notes: z.string().catch(''),
    system_prompt: z.string().catch(''),
    post_history_instructions: z.string().catch(''),
    creator: z.string().catch(''),
    character_version: z.string().catch(''),
    alternate_greetings: z.string().array().catch([]),
    tags: z.string().array().catch([]),
})

const characterCardV2Schema = z.object({
    spec: z.literal('chara_card_v2'),
    spec_version: z.literal('2.0'),
    data: characterCardV2DataSchema,
})

type CharaterCardV1 = z.infer<typeof characterCardV1Schema>

type CharacterCardV2Data = z.infer<typeof characterCardV2DataSchema>

type CharacterCardV2 = z.infer<typeof characterCardV2Schema>

const createBlankV2Card = (
    name: string,
    options: {
        description: string
        personality: string
        scenario: string
        first_mes: string
        mes_example: string
    } = { description: '', personality: '', scenario: '', first_mes: '', mes_example: '' }
): CharacterCardV2 => {
    return {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: name,
            description: options.description,
            personality: options.personality,
            scenario: options.scenario,
            first_mes: options.first_mes,
            mes_example: options.mes_example,

            // New fields start here
            creator_notes: '',
            system_prompt: '',
            post_history_instructions: '',
            alternate_greetings: [],

            // May 8th additions
            tags: [],
            creator: '',
            character_version: '',
        },
    }
}

type Macro = {
    macro: string
    value: string
}

const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const replaceMacros = (text: string) => {
    if (text === undefined) return ''
    let newtext: string = text
    const charName = Characters.useCharacterCard.getState().card?.name ?? ''
    const userName = Characters.useUserCard.getState().card?.name ?? ''
    const time = new Date()
    const rules: Macro[] = [
        { macro: '{{user}}', value: userName },
        { macro: '{{char}}', value: charName },
        { macro: '{{time}}', value: time.toLocaleTimeString() },
        { macro: '{{date}}', value: time.toLocaleDateString() },
        { macro: '{{day}}', value: weekday[time.getDay()] },
    ]
    for (const rule of rules) newtext = newtext.replaceAll(rule.macro, rule.value)
    return newtext
}

