import { Buffer } from '@craftzdog/react-native-buffer'
import { db as database } from '@db'
import axios from 'axios'
import { characterGreetings, characterTags, characters, tags } from 'db/schema'
import { eq, inArray, notInArray } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import * as DocumentPicker from 'expo-document-picker'
import * as FS from 'expo-file-system'
import { decode } from 'png-chunk-text'
import extractChunks from 'png-chunks-extract'
import { atob } from 'react-native-quick-base64'
import { create } from 'zustand'

import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { Llama3Tokenizer } from './Tokenizer/tokenizer'
import { mmkv } from './mmkv'

type CharacterTokenCache = {
    otherName: string
    description_length: number
    examples_length: number
}

type CharacterCardState = {
    card: CharacterCardV2 | undefined
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
        (set, get: () => CharacterCardState) => ({
            id: undefined,
            card: undefined,
            tokenCache: undefined,
            setCard: async (id: number) => {
                let start = performance.now()
                const card = await db.query.card(id)
                Logger.debug(`[User] time for database query: ${performance.now() - start}`)
                start = performance.now()
                set((state) => ({ ...state, card: card, id: id, tokenCache: undefined }))
                Logger.debug(`[User] time for zustand set: ${performance.now() - start}`)
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
                if (cache && cache?.otherName === useCharacterCard.getState().card?.data.name)
                    return cache

                const card = get().card
                if (!card)
                    return {
                        otherName: userName,
                        description_length: 0,
                        examples_length: 0,
                    }
                const description = replaceMacros(card.data.description)
                const examples = replaceMacros(card.data.mes_example)
                const newCache = {
                    otherName: userName,
                    description_length: Llama3Tokenizer.encode(description).length,
                    examples_length: Llama3Tokenizer.encode(examples).length,
                }

                set((state) => ({ ...state, tokenCache: newCache }))
                return newCache
            },
        })
    )

    export const useCharacterCard = create<CharacterCardState>()(
        (set, get: () => CharacterCardState) => ({
            id: undefined,
            card: undefined,
            tokenCache: undefined,
            setCard: async (id: number) => {
                let start = performance.now()
                const card = await db.query.card(id)
                Logger.debug(`[Characters] time for database query: ${performance.now() - start}`)
                start = performance.now()
                set((state) => ({ ...state, card: card, id: id, tokenCache: undefined }))

                Logger.debug(`[Characters] time for zustand set: ${performance.now() - start}`)
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
                if (cache?.otherName && cache.otherName === useUserCard.getState().card?.data.name)
                    return cache

                const card = get().card
                if (!card)
                    return {
                        otherName: charName,
                        description_length: 0,
                        examples_length: 0,
                    }
                const description = replaceMacros(card.data.description)
                const examples = replaceMacros(card.data.mes_example)

                const newCache = {
                    otherName: charName,
                    description_length: Llama3Tokenizer.encode(description).length,
                    examples_length: Llama3Tokenizer.encode(examples).length,
                }

                set((state) => ({ ...state, tokenCache: newCache }))
                return newCache
            },
        })
    )

    export namespace db {
        export namespace query {
            export const card = async (charId: number): Promise<CharacterCardV2 | undefined> => {
                const data = await database.query.characters.findFirst({
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
                if (data)
                    return {
                        spec: 'chara_card_v2',
                        spec_version: '2.0',
                        data: {
                            ...data,
                            tags: data.tags.map((item) => item.tag.tag),
                            alternate_greetings: data.alternate_greetings.map(
                                (item) => item.greeting
                            ),
                        },
                    }
            }

            export const cardList = async (type: 'character' | 'user') => {
                const query = await database.query.characters.findMany({
                    columns: {
                        id: true,
                        name: true,
                        image_id: true,
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
                    },
                    where: (characters, { eq }) => eq(characters.type, type),
                })
                return query.map((item) => ({
                    ...item,
                    tags: item.tags.map((item) => item.tag.tag),
                }))
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
                    .set({ description: card.data.description, first_mes: card.data.first_mes })
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
                if (charID === useCharacterCard.getState().id)
                    useCharacterCard.getState().unloadCard()
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

                        const greetingdata = data.alternate_greetings.map((item) => ({
                            character_id: id,
                            greeting: item,
                        }))
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

        const chunks = extractChunks(Buffer.from(file, 'base64'))
        const textChunks = chunks
            .filter(function (chunk: any) {
                return chunk.name === 'tEXt'
            })
            .map(function (chunk) {
                return decode(chunk.data)
            })

        const charactercard = JSON.parse(atob(textChunks[0].text))

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
        }).then((result) => {
            if (result.canceled) return
            return createCharacterFromImage(result.assets[0].uri)
        })
    }

    export const importCharacterFromChub = async (character_id: string) => {
        Logger.log(`Importing character from Chub: ${character_id}`, true)
        try {
            const res = await axios.create({ timeout: 10000 }).post(
                'https://api.chub.ai/api/characters/download',
                {
                    format: 'tavern',
                    fullPath: character_id,
                },
                { responseType: 'arraybuffer' }
            )

            const response = Buffer.from(res.data, 'base64').toString('base64')
            const uuid = randomUUID()
            return FS.writeAsStringAsync(`${FS.cacheDirectory}${uuid}.png`, response, {
                encoding: FS.EncodingType.Base64,
            }).then(async () => {
                return createCharacterFromImage(`${FS.cacheDirectory}${uuid}.png`)
            })
        } catch (error) {
            Logger.log(`Could not retreive card. ${error}`)
        }
    }

    export const importCharacterFromPyg = async (character_id: string) => {
        Logger.log(`Loading from Pygmalion with id: ${character_id}`, true)

        const data = await fetch(
            `https://server.pygmalion.chat/api/export/character/${character_id}/v2`,
            {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
            }
        )
        if (data.status !== 200) {
            Logger.log(`Failed to retrieve card from Pygmalion: ${data.status}`, true)
            return
        }

        const { character } = await data.json()

        const res = await fetch(character.data.avatar, {
            method: 'GET',
        })
        const buffer = await res.arrayBuffer()
        const image = Buffer.from(buffer).toString('base64')
        const uuid = randomUUID()
        return FS.writeAsStringAsync(`${FS.cacheDirectory}${uuid}.png`, image, {
            encoding: FS.EncodingType.Base64,
        }).then(async () => {
            return db.mutate.createCharacter(character, `${FS.cacheDirectory}${uuid}.png`)
        })
    }

    export const importCharacterFromRemote = async (text: string) => {
        // UUID standard RFC 4122, only used by pyg for now
        const uuidRegex =
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
        const url = new URL(text)
        if (/pygmalion.chat/.test(url.hostname)) {
            const param = new URLSearchParams(text)
            const character_id = param.get('id')?.replaceAll(`"`, '')
            const path = url.pathname.replace('/character/', '')
            console.log(path)
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
        if (/^[^/]+\/[^/]+$/.test(text)) return importCharacterFromChub(text)
        if (uuidRegex.test(text)) return importCharacterFromPyg(text)
        Logger.log(`URL not recognized`, true)
    }

    export const getImageDir = (imageId: number) => {
        return `${FS.documentDirectory}characters/${imageId}.png`
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

type Rule = {
    macro: string
    value: string
}

export const replaceMacros = (text: string) => {
    if (text === undefined) return ''
    let newtext: string = text
    const charName = Characters.useCharacterCard.getState().card?.data.name ?? ''
    const userName = Characters.useUserCard.getState().card?.data.name ?? ''
    const rules: Rule[] = [
        { macro: '{{user}}', value: userName },
        { macro: '{{char}}', value: charName },
    ]
    for (const rule of rules) newtext = newtext.replaceAll(rule.macro, rule.value)
    return newtext
}
