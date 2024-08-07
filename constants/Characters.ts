import { Buffer } from '@craftzdog/react-native-buffer'
import axios from 'axios'
import * as Base64 from 'base-64'
import * as DocumentPicker from 'expo-document-picker'
import * as FS from 'expo-file-system'
import { decode } from 'png-chunk-text'
import extractChunks from 'png-chunks-extract'
import { Logger } from './Logger'
import { db } from '@db'
import { characterGreetings, characterTags, characters, tags } from 'db/schema'
import { eq, inArray, notExists, notInArray, sql } from 'drizzle-orm'
import { create } from 'zustand'

type CharacterCardState = {
    card: CharacterCardV2 | undefined
    id: number | undefined
    setCard: (id: number) => Promise<string | undefined>
    unloadCard: () => void
}

export namespace Characters {
    export const useCharacterCard = create<CharacterCardState>(
        (set, get: () => CharacterCardState) => ({
            id: undefined,
            card: undefined,
            setCard: async (id: number) => {
                let start = performance.now()
                const card = await readCard(id)
                console.log(`[Characters] time for db query: `, performance.now() - start)
                start = performance.now()
                set((state) => ({ ...state, card: card, id: id }))

                console.log('[Characters] time for zustand set: ', performance.now() - start)
                return card?.data.name
            },
            unloadCard: () => {
                set((state) => ({ ...state, id: undefined, card: undefined }))
            },
        })
    )

    export const createCard = async (name: string) => {
        const [{ id }, ..._] = await db
            .insert(characters)
            .values({ ...TavernCardV2(name), type: 'character' })
            .returning({ id: characters.id })
        return id
    }

    export const readCard = async (charId: number): Promise<CharacterCardV2 | undefined> => {
        const data = await db.query.characters.findFirst({
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
                    alternate_greetings: data.alternate_greetings.map((item) => item.greeting),
                },
            }
    }

    export const updateCard = async (card: CharacterCardV2, charId: number) => {
        // NOTE: ...card.data fails for some reason
        await db
            .update(characters)
            .set({ description: card.data.description, first_mes: card.data.first_mes })
            .where(eq(characters.id, charId))
    }

    export const updateCardField = async (field: string, data: any, charId: number) => {
        if (field === 'tags') {
            //
            return
        }
        if (field === 'alternate_greetings') {
            //
            return
        }
        await db
            .update(characters)
            .set({ [field]: data })
            .where(eq(characters.id, charId))
    }

    export const deleteCard = async (charID: number) => {
        deleteImage(charID)
        await db.delete(characters).where(eq(characters.id, charID))
        await db
            .delete(tags)
            .where(
                notInArray(tags.id, db.select({ tag_id: characterTags.tag_id }).from(characterTags))
            )
        if (charID === useCharacterCard.getState().id) useCharacterCard.getState().unloadCard()
    }

    export const deleteImage = async (charID: number) => {
        return FS.deleteAsync(getImageDir(charID), { idempotent: true })
    }

    export const getCardList = async () => {
        const query = await db.query.characters.findMany({
            columns: {
                id: true,
                name: true,
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
            where: (characters, { eq }) => eq(characters.type, 'character'),
        })
        //  ERROR CAUSE: Drizzle incorrect type definition above
        return query.map((item) => ({ ...item, tags: item.tags.map((item) => item.tag.tag) }))
    }

    export const copyImage = async (uri: string, charID: number) => {
        await FS.copyAsync({
            from: uri,
            to: getImageDir(charID),
        })
    }

    const createCharacter = async (card: CharacterCardV2, imageuri: string = '') => {
        // TODO : Extract CharacterBook value to Lorebooks, CharacterLorebooks
        const { data } = card
        // provide warning ?
        // if (data.character_book) { console.log(warn) }
        const id = await db.transaction(async (tx) => {
            try {
                const [{ id }, ..._] = await tx
                    .insert(characters)
                    .values({
                        type: 'character',
                        ...data,
                    })
                    .returning({ id: characters.id })

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
                        await tx.query.tags.findMany({ where: inArray(tags.tag, data.tags) })
                    ).map((item) => ({
                        character_id: id,
                        tag_id: item.id,
                    }))
                    await tx.insert(characterTags).values(tagids).onConflictDoNothing()
                }
                return id
            } catch (error) {
                Logger.log(`Rolling back due to error: ` + error)
                tx.rollback()
                return undefined
            }
        })
        if (id) await copyImage(imageuri, id)
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
        const charactercard = JSON.parse(Base64.decode(textChunks[0].text))
        const newname = charactercard?.data?.name ?? charactercard.name
        Logger.log(`Creating new character: ${newname}`)
        if (newname === 'Detailed Example Character' || charactercard === undefined) {
            Logger.log('Invalid Character ID', true)
            return
        }
        return createCharacter(charactercard, uri)
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
            return FS.writeAsStringAsync(`${FS.cacheDirectory}image.png`, response, {
                encoding: FS.EncodingType.Base64,
            }).then(async () => {
                return createCharacterFromImage(`${FS.cacheDirectory}image.png`)
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
                //body: JSON.stringify({ character_id: clean }),
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

        const name = character.data.name
        const res = await fetch(character.data.avatar, {
            method: 'GET',
        })
        const buffer = await res.arrayBuffer()
        const image = Buffer.from(buffer).toString('base64')
        return FS.writeAsStringAsync(`${FS.cacheDirectory}image.png`, image, {
            encoding: FS.EncodingType.Base64,
        }).then(async () => {
            return createCharacter(character, `${FS.cacheDirectory}image.png`)
        })
    }

    export const importCharacterFromRemote = async (text: string) => {
        const url = new URL(text)

        if (url.hostname === 'pygmalion.chat') {
            const param = new URLSearchParams(text)
            const character_id = param.get('id')?.replaceAll(`"`, '')
            if (character_id) return importCharacterFromPyg(character_id)
            else {
                Logger.log(`Failed to get id from Pygmalion URL`, true)
                return
            }
        }

        if (url.hostname === 'chub.ai') {
            const path = url.pathname.replace('/characters/', '')
            if (/^[^\/]+\/[^\/]+$/.test(path)) return importCharacterFromChub(path)
            else {
                Logger.log(`Failed to get id from Chub URL`, true)
                return
            }
        }

        // Regex checks for format of [name][/][character]
        if (/^[^\/]+\/[^\/]+$/.test(text)) return importCharacterFromChub(text)
        // UUID standard RFC 4122, only used by pyg for now
        const uuidRegex =
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
        if (uuidRegex.test(text)) return importCharacterFromPyg(text)
        Logger.log(`Invalid input!`, true)
    }

    export const getImageDir = (charId: number) => {
        return `${FS.documentDirectory}characters/${charId}.png`
    }

    export const exists = async (charId: number) => {
        return await db.query.characters.findFirst({ where: eq(characters.id, charId) })
    }

    export const debugDeleteTags = async () => {
        const data = await db.delete(tags).all()
    }
    export const debugCheckTags = async () => {
        const data = await db.query.characterTags.findMany()
        console.log('CHARACTER TAGS:')
        console.log(data)
        const tags = await db.query.tags.findMany()
        console.log('TAGS:')
        console.log(tags)
    }

    export const debugDelete = async () => {
        await db.delete(characters).all()
        await db.delete(characterTags).all()
        await db.delete(tags).all()
        const list = await FS.readDirectoryAsync(`${FS.documentDirectory}characters`)
        console.log(list)
        for (const file of list) {
            await FS.deleteAsync(`${FS.documentDirectory}characters/${file}`)
        }
    }
}

type CharacterCardV1 = {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
}

export type CharacterCardV2 = {
    spec: string
    spec_version: string
    data: {
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
        alternate_greetings: Array<string>
        //character_book: string

        // May 8th additions
        tags: Array<string>
        creator: string
        character_version: string
        //extensions: {},
    }
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
