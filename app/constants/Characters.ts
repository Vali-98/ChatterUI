import { db as database } from '@db'
import { copyFileRes, writeFile } from '@dr.pogodin/react-native-fs'
import {
    characterGreetings,
    characterTags,
    characters,
    chatEntries,
    chatSwipes,
    chats,
    tags,
} from 'db/schema'
import { desc, eq, inArray, notInArray } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import * as DocumentPicker from 'expo-document-picker'
import * as FS from 'expo-file-system'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { API } from './API'
import { Global } from './GlobalValues'
import { Llama } from './LlamaLocal'
import { Logger } from './Logger'
import { mmkv, mmkvStorage } from './MMKV'
import { getPngChunkText } from './PNG'
import { Tokenizer } from './Tokenizer'

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
}

type CharacterCardState = {
    card?: CharacterCardV2
    tokenCache: CharacterTokenCache | undefined
    id: number | undefined
    setCard: (id: number) => Promise<string | undefined>
    unloadCard: () => void
    getImage: () => string
    updateImage: (sourceURI: string) => void
    getCache: (otherName: string) => CharacterTokenCache
}

export namespace Characters {
    export const useUserCard = create<CharacterCardState>()(
        persist(
            (set, get) => ({
                id: undefined,
                card: undefined,
                tokenCache: undefined,
                setCard: async (id: number) => {
                    const card = await db.query.card(id)
                    db.mutate.updateModified(id)
                    set((state) => ({ ...state, card: card, id: id, tokenCache: undefined }))
                    mmkv.set(Global.UserID, id)
                    return card?.data.name
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
                    return getImageDir(get().card?.data.image_id ?? 0)
                },
                updateImage: async (sourceURI: string) => {
                    const id = get().id
                    const oldImageID = get().card?.data.image_id
                    const card = get().card
                    if (!id || !oldImageID || !card) {
                        Logger.log('Could not get data, something very wrong has happned!', true)
                        return
                    }
                    const imageID = new Date().getTime()
                    await db.mutate.updateCardField('image_id', imageID, id)
                    await deleteImage(oldImageID)
                    await copyImage(sourceURI, imageID)
                    card.data.image_id = imageID
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
                        }
                    const description = replaceMacros(card.data.description)
                    const examples = replaceMacros(card.data.mes_example)
                    const getTokenCount =
                        mmkv.getString(Global.APIType) === API.LOCAL
                            ? Llama.useLlama.getState().tokenLength
                            : Tokenizer.useTokenizer.getState().getTokenCount

                    const newCache = {
                        otherName: userName,
                        description_length: getTokenCount(description),
                        examples_length: getTokenCount(examples),
                    }

                    set((state) => ({ ...state, tokenCache: newCache }))
                    return newCache
                },
            }),
            {
                name: 'usercard-storage',
                storage: createJSONStorage(() => mmkvStorage),
                version: 1,
                partialize: (state) => ({ id: state.id, card: state.card }),
            }
        )
    )

    export const useCharacterCard = create<CharacterCardState>()((set, get) => ({
        id: undefined,
        card: undefined,
        tokenCache: undefined,
        setCard: async (id: number) => {
            const card = await db.query.card(id)
            db.mutate.updateModified(id)
            set((state) => ({ ...state, card: card, id: id, tokenCache: undefined }))
            return card?.data.name
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
            return getImageDir(get().card?.data.image_id ?? 0)
        },
        updateImage: async (sourceURI: string) => {
            const imageID = get().card?.data.image_id
            if (imageID) return copyImage(sourceURI, imageID)
        },
        getCache: (charName: string) => {
            const cache = get().tokenCache
            const card = get().card
            if (cache?.otherName && cache.otherName === useUserCard.getState().card?.data.name)
                return cache

            if (!card)
                return {
                    otherName: charName,
                    description_length: 0,
                    examples_length: 0,
                }
            const description = replaceMacros(card.data.description)
            const examples = replaceMacros(card.data.mes_example)
            const getTokenCount =
                mmkv.getString(Global.APIType) === API.LOCAL
                    ? Llama.useLlama.getState().tokenLength
                    : Tokenizer.useTokenizer.getState().getTokenCount

            const newCache = {
                otherName: charName,
                description_length: getTokenCount(description),
                examples_length: getTokenCount(examples),
            }
            set((state) => ({ ...state, tokenCache: newCache }))
            return newCache
        },
    }))

    export namespace db {
        export namespace query {
            export const card = async (charId: number): Promise<CharacterCardV2 | undefined> => {
                const data = await database.query.characters.findFirst({
                    where: eq(characters.id, charId),
                    columns: { id: false },
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
                if (data)
                    return {
                        spec: 'chara_card_v2',
                        spec_version: '2.0',
                        data: {
                            ...data,
                            last_modified: data?.last_modified ?? 0, // assume this never actually fails
                            tags: data.tags.map((item) => item.tag.tag),
                            alternate_greetings: data.alternate_greetings.map(
                                (item) => item.greeting
                            ),
                        },
                    }
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
                const [{ id }, ..._] = await database
                    .insert(characters)
                    .values({ ...TavernCardV2(name), type: type })
                    .returning({ id: characters.id })
                return id
            }

            export const updateCard = async (card: CharacterCardV2, cardID: number) => {
                await database
                    .update(characters)
                    .set({
                        description: card.data.description,
                        first_mes: card.data.first_mes,
                        name: card.data.name,
                    })
                    .where(eq(characters.id, cardID))
            }

            // TODO: Proper per field updates, though not that expensive
            export const updateCardField = async (
                field: keyof CharacterCardV2Data,
                data: any,
                charId: number
            ) => {
                if (field === 'tags') {
                    // find tags and update
                    return
                }
                if (field === 'alternate_greetings') {
                    // find greetings and update
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
                    .set({ last_modified: new Date().getTime() })
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

                        if (data.tags.length !== 0) {
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
                        Logger.log(`Rolling back due to error: ` + error)
                        tx.rollback()
                        return undefined
                    }
                })
                if (image_id) await copyImage(imageuri, image_id)
            }

            export const duplicateCard = async (charId: number) => {
                const card = await db.query.card(charId)

                if (!card) {
                    Logger.log('Failed to copy card: Card does not exit', true)
                    return
                }
                const cacheLoc = `${FS.cacheDirectory}${card.data.image_id}`
                await FS.copyAsync({
                    from: getImageDir(card.data.image_id),
                    to: cacheLoc,
                })
                const now = new Date().getTime()
                card.data.last_modified = now
                card.data.image_id = now
                await createCharacter(card, cacheLoc)
                    .then(() => Logger.log(`Card cloned: ${card.data.name}`))
                    .catch((e) => Logger.log(`Failed to clone card: ${e}`))
            }
        }
    }

    export const deleteImage = async (imageID: number) => {
        return FS.deleteAsync(getImageDir(imageID), { idempotent: true })
    }

    export const copyImage = async (uri: string, imageID: number) => {
        await FS.copyAsync({
            from: uri,
            to: getImageDir(imageID),
        })
    }

    export const createCharacterFromImage = async (uri: string) => {
        const file = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 })
        if (!file) {
            Logger.log(`Failed to create card - Image could not be retrieved`, true)
            return
        }

        const charactercard = getPngChunkText(file)

        // WARNING: dangerous here, card is never verified to fulfill v2 card spec

        if (charactercard === undefined) {
            Logger.log('No character was found.', true)
            return
        }
        if (charactercard?.spec_version !== '2.0') {
            Logger.log('Character card must be in V 2.0 format.', true)
            return
        }

        const newname = charactercard?.data?.name ?? charactercard.name

        Logger.log(`Creating new character: ${newname}`)
        return db.mutate.createCharacter(charactercard, uri)
    }

    export const importCharacterFromImage = async () => {
        return DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: 'image/*',
            multiple: true,
        }).then((result) => {
            if (result.canceled) return
            result.assets.map(async (item) => {
                await createCharacterFromImage(item.uri).catch((e) =>
                    Logger.log(`Failed to create card from '${item.name}': ${e}`)
                )
            })
        })
    }

    export const importCharacterFromChub = async (character_id: string) => {
        Logger.log(`Importing character from Chub: ${character_id}`, true)
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
            await writeFile(cardCacheDir, btoa(binaryString), 'base64')
            return createCharacterFromImage(cardCacheDir)
        } catch (error) {
            Logger.log(`Could not retreive card. ${error}`)
        }
    }

    export const importCharacterFromPyg = async (character_id: string) => {
        Logger.log(`Loading from Pygmalion with id: ${character_id}`, true)

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
            Logger.log(`Failed to retrieve card from Pygmalion: ${query.status}`, true)
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

        await writeFile(`${FS.cacheDirectory}${uuid}.png`, btoa(binaryString), 'base64')
        await db.mutate.createCharacter(character, `${FS.cacheDirectory}${uuid}.png`)
        Logger.log('Imported Character: ' + character.data.name)
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
                Logger.log(`Failed to get id from Pygmalion URL`, true)
                return
            }
        }

        if (/chub.ai|characterhub.org/.test(url.hostname)) {
            const path = url.pathname.replace('/characters/', '')
            if (/^[^/]+\/[^/]+$/.test(path)) return importCharacterFromChub(path)
            else {
                Logger.log(`Failed to get id from Chub URL`, true)
                return
            }
        }

        // Regex checks for format of [name][/][character]
        Logger.log(`URL not recognized`, true)
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
        if (!fileinfo.exists) await copyFileRes(resName, cardDefaultDir)
        await createCharacterFromImage(cardDefaultDir)
    }
}

export type CharacterCardV2Data = {
    // field for chatterUI
    image_id: number

    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string

    // New fields start here
    creator_notes: string
    system_prompt: string
    post_history_instructions: string
    alternate_greetings: string[]
    //for ChatterUI this will be removed into its own table
    //character_book: string

    // May 8th additions
    tags: string[]
    creator: string
    character_version: string
    //extensions: {},
    last_modified: number | null
}

export type CharacterCardV2 = {
    spec: string
    spec_version: string
    data: CharacterCardV2Data
}

const TavernCardV2 = (name: string) => {
    return {
        name: name,
        description: '',
        personality: '',
        scenario: '',
        first_mes: '',
        mes_example: '',

        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: name,
            description: '',
            personality: '',
            scenario: '',
            first_mes: '',
            mes_example: '',

            // New fields start here
            creator_notes: '',
            system_prompt: '',
            post_history_instructions: '',
            alternate_greetings: [],
            character_book: '',

            // May 8th additions
            tags: [],
            creator: '',
            character_version: '',
            extensions: {},
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
    const charName = Characters.useCharacterCard.getState().card?.data.name ?? ''
    const userName = Characters.useUserCard.getState().card?.data.name ?? ''
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
