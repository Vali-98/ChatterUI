import * as FS from 'expo-file-system'
import {MMKV} from 'react-native-mmkv'
import { createContext } from 'react'

const mmkv = new MMKV()


export const MessageContext = createContext([])

export const enum Global {
    CurrentCharacter='currentchar',     // current char filename, locates dir
    CurrentChat='currentchat',          // current chat filename, locates dir
    CurrentPreset='currentpreset',      // note: use Object ? - stores preset 
    CurrentInstruct='currentinstruct',  // note: use Object ? - stores instruct
    CurrentCharacterCard='charcard',    // note: use Object ? - stores charactercard
    CurrentUser='currentuser',          // current username, locates dir
    CurrentUserCard='usercard',         // note: use Object ? - stores usercard
    Endpoint='endpoint',                // api endpoint 
    NowGenerating='nowgenerating',      // generation signal
    EditedWindow='editedwindow',        // exit editing window confirmation
}


// generate default directories

export const generateDefaultDirectories = async () => {
    FS.makeDirectoryAsync(`${FS.documentDirectory}characters`).catch(() => console.log(`Could not create characters folder.`))
    FS.makeDirectoryAsync(`${FS.documentDirectory}persona`).catch(() => console.log(`Could not create personas folder.`))
    FS.makeDirectoryAsync(`${FS.documentDirectory}preset`).catch(() => console.log(`Could not create presets folder.`))
    FS.makeDirectoryAsync(`${FS.documentDirectory}instruct`).catch(() => console.log(`Could not create instruct folder.`))
    createNewUser('User')    
}


export const createNewUser = async (name : string) => {
    return FS.makeDirectoryAsync(`${FS.documentDirectory}persona/${name}`).then(() => {
        return FS.writeAsStringAsync(`${FS.documentDirectory}persona/${name}/${name}.json`, JSON.stringify({
            description: ""
        }), {encoding: FS.EncodingType.UTF8})
    }).catch(() => {console.log(`Could not create user.`)})

}
export const deleteUser = async (name : string) => {
    return FS.deleteAsync(`${FS.documentDirectory}persona/${name}`)
}

export const loadUserCard = async (name : string) => {
    return FS.readAsStringAsync(`${FS.documentDirectory}persona/${name}/${name}.json`, {encoding: FS.EncodingType.UTF8})
}

//////// IMPORTANT: rework all default values to '' and set after

// reset values to default upon first load

export const resetValues = () => {
    mmkv.set(Global.CurrentCharacter, 'Welcome')
    mmkv.set(Global.CurrentChat, '')
    mmkv.set(Global.NowGenerating, false)
}

//

export const createNewCharacter = async (
    charName : string
) => {
    return FS.makeDirectoryAsync(`${FS.documentDirectory}characters/${charName}`)
    .then(() => {
        return FS.makeDirectoryAsync(`${FS.documentDirectory}characters/${charName}/chats`)
    }).then(() => {
        return FS.writeAsStringAsync(
            `${FS.documentDirectory}characters/${charName}/${charName}.json`, 
            JSON.stringify(TavernCardV2(charName)),
            {encoding: FS.EncodingType.UTF8})
    })
}


// returns filename of newly created file
export const createNewDefaultChat = (
        charName = mmkv.getString(Global.CurrentCharacter) , 
        userName = mmkv.getString(Global.CurrentUser)
    ) => {
    console.log(`Creating new chat for character: ${charName} and user: ${userName}`)
    if(charName === 'Welcome')
        return

    return FS.readAsStringAsync(
        `${FS.documentDirectory}characters/${charName}/${charName}.json`, 
        {encoding: FS.EncodingType.UTF8})
    .then( response => {
        let card = JSON.parse(response)
        const newmessage = createNewChat(userName, charName, ( card.data.first_mes ?? card.first_mes ))
        return FS.writeAsStringAsync(
            `${FS.documentDirectory}characters/${charName}/chats/${newmessage[0].create_date}.jsonl`, 
            newmessage.map((item: any)=> JSON.stringify(item)).join('\u000d\u000a'),
            {encoding:FS.EncodingType.UTF8}).then(
                () => {return `${newmessage[0].create_date}.jsonl`
                })
    }).catch(error => console.log(`Could not create new chat file.\n${error}`))
}

const createNewChat = (userName : any, characterName : any, initmessage : any) => {
	return [
		{"user_name":userName,"character_name":characterName,"create_date":humanizedISO8601DateTime(),"chat_metadata":{"note_prompt":"","note_interval":1,"note_position":1,"note_depth":4,"objective":{"currentObjectiveId":0,"taskTree":{"id":0,"description":"","completed":false,"parentId":"","children":[]},"checkFrequency":"3","chatDepth":"2","hideTasks":false,"prompts":{"createTask":"Pause your roleplay and generate a list of tasks to complete an objective. Your next response must be formatted as a numbered list of plain text entries. Do not include anything but the numbered list. The list must be prioritized in the order that tasks must be completed.\n\nThe objective that you must make a numbered task list for is: [{{objective}}].\nThe tasks created should take into account the character traits of {{char}}. These tasks may or may not involve {{user}} directly. Be sure to include the objective as the final task.\n\nGiven an example objective of 'Make me a four course dinner', here is an example output:\n1. Determine what the courses will be\n2. Find recipes for each course\n3. Go shopping for supplies with {{user}}\n4. Cook the food\n5. Get {{user}} to set the table\n6. Serve the food\n7. Enjoy eating the meal with {{user}}\n    ","checkTaskCompleted":"Pause your roleplay. Determine if this task is completed: [{{task}}].\nTo do this, examine the most recent messages. Your response must only contain either true or false, nothing other words.\nExample output:\ntrue\n    ","currentTask":"Your current task is [{{task}}]. Balance existing roleplay with completing this task."}}}},
		{"name":characterName,"is_user":false,"send_date":humanizedISO8601DateTime(),"mes":initmessage},
	]
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

function humanizedISO8601DateTime(date: string = '') {
    let baseDate = typeof date === 'number' ? new Date(date) : new Date();
    let humanYear = baseDate.getFullYear();
    let humanMonth = (baseDate.getMonth() + 1);
    let humanDate = baseDate.getDate();
    let humanHour = (baseDate.getHours() < 10 ? '0' : '') + baseDate.getHours();
    let humanMinute = (baseDate.getMinutes() < 10 ? '0' : '') + baseDate.getMinutes();
    let humanSecond = (baseDate.getSeconds() < 10 ? '0' : '') + baseDate.getSeconds();
    let humanMillisecond = (baseDate.getMilliseconds() < 10 ? '0' : '') + baseDate.getMilliseconds();
    let HumanizedDateTime = (humanYear + "-" + humanMonth + "-" + humanDate + " @" + humanHour + "h " + humanMinute + "m " + humanSecond + "s " + humanMillisecond + "ms");
    return HumanizedDateTime;
}

// dirs

export const getChatFileDirectory = (
    charName = mmkv.getString(Global.CurrentCharacter),
    chatfilename = mmkv.getString(Global.CurrentChat)
) => {
    return `${FS.documentDirectory}characters/${charName}/chats/${chatfilename}`
}

export const getCharacterCardDirectory = (
    charName = mmkv.getString(Global.CurrentCharacter)
) => {
    return `${FS.documentDirectory}characters/${charName}/${charName}.json`
}

export const getCharacterImageDirectory = (
    charName = mmkv.getString(Global.CurrentCharacter)
) => {
    return `${FS.documentDirectory}characters/${charName}/${charName}.png`
}

export const getChatDirectory = (
    charName = mmkv.getString(Global.CurrentCharacter)
) => {
    return `${FS.documentDirectory}characters/${charName}/chats`
}

export const getCharacterDirectory = (
    charName = mmkv.getString(Global.CurrentCharacter)
) => {
    return `${FS.documentDirectory}characters/${charName}`
}

// get chat filenames

export const getNewestChatFilename = async (
    charName = mmkv.getString(Global.CurrentCharacter)
) => {
    let chats = await getChatFilenames(charName)
    return (chats.length === 0) ? await createNewDefaultChat(charName) : chats.at(-1)
}

export const getChatFilenames = async (
    charName = mmkv.getString(Global.CurrentCharacter)
) => {

    return await FS.readDirectoryAsync(getChatDirectory(charName)).catch(() => console.log(`Failed to get chat directory of ${charName}`))
    .then((response : any) => {
        return response
    })
}

// get user filenames

export const getUserFilenames = () => {
    return FS.readDirectoryAsync(`${FS.documentDirectory}persona`)
}

export const getUserImageDirectory = (
    userName : string
) => {
    return `${FS.documentDirectory}persona/${userName}/${userName}.png`
}

// get chat file

export const getChatFile = async (
    charName = mmkv.getString(Global.CurrentCharacter),
    chatfilename = mmkv.getString(Global.CurrentChat)
) => {
    return await FS.readAsStringAsync(getChatFileDirectory(charName, chatfilename),{encoding:FS.EncodingType.UTF8}).then((file) => {
        return file.split('\u000d\u000a').map(row => JSON.parse(row))
    }).catch(() => console.log(`Couldn't load chat file ${chatfilename} for ${charName}`))
}

export const deleteChatFile = async (
    charName = mmkv.getString(Global.CurrentCharacter),
    chatfilename = mmkv.getString(Global.CurrentChat)
) => {
    return await FS.deleteAsync(getChatFileDirectory(charName, chatfilename)).then(() => {
        return getChatFilenames(charName).then(files => {
            if (files.length === 0)
                return createNewDefaultChat(charName)
        })
    })
}

// save chat file

export const saveChatFile = async (
    messages : string[],
    charName = '',
    currentChat = ''
) => {
    let _charName = (charName === '') ? mmkv.getString(Global.CurrentCharacter) : charName
    let _currentChat = (currentChat === '')? mmkv.getString(Global.CurrentChat) : currentChat
    
    FS.writeAsStringAsync(
        `${FS.documentDirectory}characters/${_charName}/chats/${_currentChat}`, 
        messages.map((item)=> JSON.stringify(item)).join('\u000d\u000a'),
        {encoding:FS.EncodingType.UTF8}).catch(error => console.log(`Could not save file! ${error}`))
}

// get character card

export const getCharacterCard = async (
    charName = mmkv.getString(Global.CurrentCharacter)
) => {
    return await FS.readAsStringAsync(getCharacterCardDirectory(charName), {encoding: FS.EncodingType.UTF8})
}

// save character card  

export const saveCharacterCard = async (
    charName = mmkv.getString(Global.CurrentCharacter) ,
    data : string
) => {
    return await FS.writeAsStringAsync(getCharacterCardDirectory(charName), data,  {encoding: FS.EncodingType.UTF8})
}

export const deleteCharacter = async (
    charName = mmkv.getString(Global.CurrentCharacter)
) => {
    return await FS.deleteAsync(getCharacterDirectory(charName))
}

export const getCharacterList = async () => {
    return await FS.readDirectoryAsync(`${FS.documentDirectory}characters`)
}

export const copyCharImage = async (
    uri: string,
    charName = mmkv.getString(Global.CurrentCharacter) 
) => {
    FS.copyAsync({
        from: uri,
        to: getCharacterImageDirectory(charName)
    })
}