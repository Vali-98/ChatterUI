import { Buffer } from '@craftzdog/react-native-buffer'
import axios from 'axios'
import * as Base64 from 'base-64'
import * as DocumentPicker from 'expo-document-picker'
import * as FS from 'expo-file-system'
import { decode } from 'png-chunk-text'
import extractChunks from 'png-chunks-extract'
import { Logger } from './Logger'

export namespace Characters {
    export const createCard = async (charName: string) => {
        return FS.makeDirectoryAsync(getDir(charName))
            .then(() => {
                return FS.makeDirectoryAsync(getChatDir(charName))
            })
            .then(() => {
                return FS.writeAsStringAsync(
                    getCardDir(charName),
                    JSON.stringify(TavernCardV2(charName)),
                    { encoding: FS.EncodingType.UTF8 }
                )
            })
    }

    export const getCard = async (charName: string | undefined) => {
        if (charName)
            return await FS.readAsStringAsync(getCardDir(charName), {
                encoding: FS.EncodingType.UTF8,
            })
    }

    export const saveCard = async (charName: string | undefined, data: string) => {
        if (charName)
            return await FS.writeAsStringAsync(getCardDir(charName), data, {
                encoding: FS.EncodingType.UTF8,
            })
    }

    export const deleteCard = async (charName: string | undefined) => {
        if (charName) return await FS.deleteAsync(getDir(charName))
    }

    export const getCardList = async () => {
        return await FS.readDirectoryAsync(`${FS.documentDirectory}characters`)
    }

    export const copyImage = async (uri: string, charName: string) => {
        if (charName)
            FS.copyAsync({
                from: uri,
                to: getImageDir(charName),
            })
    }

    const createCharacter = (name: string, card: CharacterCardV2, imageuri: string = '') => {
        Characters.createCard(name)
            .then(() => {
                return Characters.saveCard(name, JSON.stringify(card))
            })
            .then(() => {
                if (imageuri) return Characters.copyImage(imageuri, name)
            })
            .then(() => {
                Logger.log(`Successfully Imported Character`, true)
            })
            .catch(() => {
                Logger.log(`Failed to create card - Character might already exist.`, true)
            })
    }

    export const createCharacterFromImage = async (uri: string) => {
        return FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 })
            .then((file) => {
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
                createCharacter(newname, charactercard, uri)
            })
            .catch((error) => {
                Logger.log(`Failed to create card - Character might already exist?`, true)
                Logger.log(error)
            })
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

    export const importCharacterFromChub = async (text: string) => {
        const character_id = text.replaceAll(`https://chub.ai/characters/`, '')
        Logger.log(`Importing character from Chub: ${character_id}`, true)
        return axios
            .create({ timeout: 10000 })
            .post(
                'https://api.chub.ai/api/characters/download',
                {
                    format: 'tavern',
                    fullPath: character_id,
                },
                { responseType: 'arraybuffer' }
            )
            .then((res) => {
                const response = Buffer.from(res.data, 'base64').toString('base64')
                return FS.writeAsStringAsync(`${FS.cacheDirectory}image.png`, response, {
                    encoding: FS.EncodingType.Base64,
                }).then(async () => {
                    return createCharacterFromImage(`${FS.cacheDirectory}image.png`)
                })
            })
            .catch((error) => {
                Logger.log(`Could not retreive card. ${error}`)
            })
    }

    export const importCharacterFromPyg = async (id: string) => {
        const character_id = id
            .replace(
                `https://pygmalion.chat/characters#modal=false&type=%22character%22&id=%22`,
                ''
            )
            .replace(`https://pygmalion.chat/characters#modal=true&type=%22character%22&id=%22`, '')
            .replace(`%22&page=1`, '')
            .trim()
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
            return createCharacter(name, character, `${FS.cacheDirectory}image.png`)
        })
    }

    export const importCharacterFromRemote = async (text: string) => {
        const stripwww = text.replace('www.', '')
        if (stripwww.startsWith('https://chub.ai/characters/'))
            return importCharacterFromChub(stripwww)
        if (stripwww.startsWith(`https://pygmalion.chat`)) return importCharacterFromPyg(stripwww)
        if (stripwww.includes('/')) return importCharacterFromChub(stripwww)
        if (stripwww.includes(`-`)) return importCharacterFromPyg(stripwww)
        Logger.log(`Invalid input!`, true)
    }
    export const getChatDir = (charName: string) => {
        return `${FS.documentDirectory}characters/${charName}/chats`
    }

    export const getCardDir = (charName: string) => {
        return `${FS.documentDirectory}characters/${charName}/${charName}.json`
    }

    export const getImageDir = (charName: string | undefined) => {
        return charName ? `${FS.documentDirectory}characters/${charName}/${charName}.png` : ''
    }

    export const getDir = (charName: string) => {
        return `${FS.documentDirectory}characters/${charName}`
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
        character_book: string

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
