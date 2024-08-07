import * as FS from 'expo-file-system'

export namespace Characters {

    export const createCard = async (
        charName : string
    ) => {
        return FS.makeDirectoryAsync(getDir(charName))
        .then(() => {
            return FS.makeDirectoryAsync(getChatDir(charName))
        }).then(() => {
            return FS.writeAsStringAsync(
                getCardDir(charName), 
                JSON.stringify(TavernCardV2(charName)),
                {encoding: FS.EncodingType.UTF8})
        })
    }
    
    export const getCard = async (
        charName : string
    ) => {
        return await FS.readAsStringAsync(getCardDir(charName), {encoding: FS.EncodingType.UTF8})
    }
    
    export const saveCard = async (
        charName : string ,
        data : string
    ) => {
        return await FS.writeAsStringAsync(getCardDir(charName), data,  {encoding: FS.EncodingType.UTF8})
    }
    
    export const deleteCard = async (
        charName : string
    ) => {
        return await FS.deleteAsync(getDir(charName))
    }
    
    export const getCardList = async () => {
        return await FS.readDirectoryAsync(`${FS.documentDirectory}characters`)
    }
    
    export const copyImage = async (
        uri: string,
        charName : string
    ) => {
        FS.copyAsync({
            from: uri,
            to: getImageDir(charName)
        })
    }

    export const getChatDir = (
        charName : string 
    ) => {
        return `${FS.documentDirectory}characters/${charName}/chats`
    }

    export const getCardDir = (
        charName : string
    ) => {
        return `${FS.documentDirectory}characters/${charName}/${charName}.json`
    }

    export const getImageDir = (
        charName : string
    ) => {
        return `${FS.documentDirectory}characters/${charName}/${charName}.png`
    }

    export const getDir = (
        charName : string
    ) => {
        return `${FS.documentDirectory}characters/${charName}`
    }
}

const TavernCardV2 = (name : string) => { 
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
      }
    }
}