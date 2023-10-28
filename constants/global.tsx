import * as FS from 'expo-file-system'
import {MMKV} from 'react-native-mmkv'
import { createContext } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import { ToastAndroid, StyleSheet } from 'react-native'
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application'
const mmkv = new MMKV()
export const MessageContext = createContext([])

export const resetEncryption = (value = 0) => {
    mmkv.recrypt(Crypto.getRandomBytes(16).toString())
}

export const enum Color {
    Header= '#1e1e1e',
    Background = '#222',
    Container = '#333',
    BorderColor = '#252525',
    White = '#fff',
    Text = '#fff',
    TextItalic = '#aaa',
    TextQuote = '#e69d17',
    Black = '#000',
    DarkContainer= '#111',
    Offwhite= '#888',
    Button = '#ddd',
    TextWhite = '#fff',
    TextBlack = '#000',
}

export const enum Global {

    // Processing
    
    NowGenerating='nowgenerating',      // generation signal
    EditedWindow='editedwindow',        // exit editing window confirmation

    // Character

    CurrentCharacter='currentchar',     // current char filename, locates dir
    CurrentCharacterCard='charcard',    // note: use Object ? - stores charactercard

    // User

    CurrentUser='currentuser',          // current username, locates dir
    CurrentUserCard='usercard',         // note: use Object ? - stores usercard
    
    // Chat

    CurrentChat='currentchat',          // current chat filename, locates dir
    
    // Instruct

    InstructName='instructname',        // name of current instruct preset
    CurrentInstruct='currentinstruct',  // note: use Object ? - stores instruct

    // Presets

    //CurrentPreset='currentpreset',      // note: use Object ? - stores preset 
    //PresetName='presetname',            // name of current preset

    PresetKAI='currentpresetkai',
    PresetNameKAI='presetnamekai',

    PresetTGWUI='currentpresettgwui',
    PresetNameTGWUI='presetnametgwui',

    PresetNovelAI='currentpresetnovelai',
    PresetNameNovelAI='presetnamenovelai',

    // APIs

    APIType='endpointtype',             // name of current api mode
    
    KAIEndpoint='kaiendpoint',          // kai api endpoint
    
    TGWUIBlockingEndpoint='tgwuiblockingendpoint',   // tgwui endpoint
    TGWUIStreamingEndpoint='tgwuistreamingendpoint', // tgwui streaming web socket

    HordeKey='hordekey',                // api key for horde 
    HordeModels='hordemodel',           // names of horde models to be used
    HordeWorkers = 'hordeworker',       // List of available horde workers

    MancerKey='mancerkey',              // api key for mancer
    MancerModel='mancermodel',          // selected mancer model

    NovelKey='novelkey',                // novelai key
    NovelModel='novelmodel',            // novelai model

    AphroditeKey = 'aphroditekey',      // api key for aphrodite, default is `EMPTY`
}

export const enum API {
    KAI = 'kai',
    HORDE = 'horde',
    TGWUI = 'textgenwebui',
    MANCER = 'mancer',
    NOVELAI = 'novel',
    APHRODITE = 'aphrodite',
}

export const GlobalStyle = StyleSheet.create({
    
})

// general downloader

export const saveStringExternal = async (
    filename : string,
    filedata : string,
) => {
    const permissions = await FS.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
        let directoryUri = permissions.directoryUri
        await FS.StorageAccessFramework.createFileAsync(directoryUri, filename, "application/json")
        .then(async(fileUri) => {
            await FS.writeAsStringAsync(fileUri, filedata, { encoding: FS.EncodingType.UTF8 })
            ToastAndroid.show(`File saved sucessfully`, 2000)
        })
        .catch((e) => {
            console.log(e)
        })
    }
} 

// horde

export const hordeHeader = () => {
    return { "Client-Agent":`ChatterUI:${Application.nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`} 
}

// generate default directories

export const generateDefaultDirectories = async () => {
    return FS.makeDirectoryAsync(`${FS.documentDirectory}characters`).catch(() => console.log(`Could not create characters folder.`)).then(
        () => { return FS.makeDirectoryAsync(`${FS.documentDirectory}presets`).catch(() => console.log(`Could not create presets folder.`))}
    ).then(
        () => { return FS.makeDirectoryAsync(`${FS.documentDirectory}presets/kai`).catch(() => console.log(`Could not create instruct folder.`))}
    ).then(
        () => { return FS.makeDirectoryAsync(`${FS.documentDirectory}presets/tgwui`).catch(() => console.log(`Could not create instruct folder.`))}
    ).then(
        () => { return FS.makeDirectoryAsync(`${FS.documentDirectory}presets/novelai`).catch(() => console.log(`Could not create instruct folder.`))}
    ).then(
        () => { return FS.makeDirectoryAsync(`${FS.documentDirectory}instruct`).catch(() => console.log(`Could not create instruct folder.`))}
    ).then(
        () => { return FS.makeDirectoryAsync(`${FS.documentDirectory}persona`).catch(() => console.log(`Could not create personas folder.`))}
    )
}

// default presets

export const createDefaultPresets = async () => {
    console.log('Creating Default Presets')
    await writePreset(`Default`, defaultPresetKAI(), 'kai')
    await writePreset(`Default`, defaultPresetTGWUI(), 'tgwui')
    await writePreset(`Default`, defaultPresetNovelAI(), 'novelai')
}


// presets

const apiType = () => {
    let type : string = 'kai'
    const api = mmkv.getString(Global.APIType)
    if(api === API.MANCER || api === API.TGWUI || api === API.APHRODITE)
        type = 'tgwui'
    if(api === API.NOVELAI)
        type = 'novelai'
    return type
}

export const loadPreset = async (name : string, api = apiType()) => {    
    return FS.readAsStringAsync(`${FS.documentDirectory}presets/${api}/${name}.json`, {encoding: FS.EncodingType.UTF8})
}

export const writePreset = async (name : string, preset : Object, api = apiType()) => {
    return FS.writeAsStringAsync(`${FS.documentDirectory}presets/${api}/${name}.json`, JSON.stringify(preset), {encoding:FS.EncodingType.UTF8})
}

export const deletePreset = async (name : string ,api = apiType() ) => {
    return FS.deleteAsync(`${FS.documentDirectory}presets/${api}/${name}.json`)
}

export const getPresetList = async (api = apiType()) => {
    return FS.readDirectoryAsync(`${FS.documentDirectory}presets/${api}`)
}

export const uploadPreset = async (api = apiType()) => {
    return DocumentPicker.getDocumentAsync({type:'application/json'}).then((result) => {
        if(result.canceled) return
        let name = result.assets[0].name.replace(`.json`, '')
        return FS.copyAsync({
            from: result.assets[0].uri, 
            to: `${FS.documentDirectory}/presets/${api}/${name}.json`
        }).then(() => {
            return FS.readAsStringAsync(`${FS.documentDirectory}/preset/${api}/${name}.json`, {encoding: FS.EncodingType.UTF8})
        }).then((file) => {
            console.log(JSON.parse(file))
            let filekeys =Object.keys(JSON.parse(file))
            let preset = defaultKAIPreset()
            if(api === 'tgwui')
                preset = defaultTGWUIPreset()
            if(api === 'novelai')
                preset = defaultNovelAIPreset()

            let correctkeys = Object.keys(preset)
            let samekeys =  filekeys.every((element, index) => {return element === correctkeys[index]})
            if (!samekeys) {
                return FS.deleteAsync(`${FS.documentDirectory}/preset/${api}/${name}.json`).then(() => {
                    throw new TypeError(`JSON file has invalid format`)
                })
            }
            else
                return name
        }).catch(error => ToastAndroid.show(error.message, 2000))
    })
}

// instruct

export const loadInstruct = async (name : string) => {
    return FS.readAsStringAsync(`${FS.documentDirectory}instruct/${name}.json`, {encoding: FS.EncodingType.UTF8})
}

export const writeInstruct = async (name : string, preset : Object) => {
    return FS.writeAsStringAsync(`${FS.documentDirectory}instruct/${name}.json`, JSON.stringify(preset), {encoding:FS.EncodingType.UTF8})
}

export const deleteInstruct = async (name : string ) => {
    return FS.deleteAsync(`${FS.documentDirectory}instruct/${name}.json`)
}

export const getInstructList = async () => {
    return FS.readDirectoryAsync(`${FS.documentDirectory}instruct`)
}

export const uploadInstruct = async () => {
    return DocumentPicker.getDocumentAsync({type:'application/json'}).then((result) => {
        if(result.canceled) return
        let name = result.assets[0].name.replace(`.json`, '')
        return FS.copyAsync({
            from: result.assets[0].uri, 
            to: `${FS.documentDirectory}/instruct/${name}.json`
        }).then(() => {
            return FS.readAsStringAsync(`${FS.documentDirectory}/instruct/${name}.json`, {encoding: FS.EncodingType.UTF8})
        }).then((file) => {
            let filekeys =Object.keys(JSON.parse(file))
            let correctkeys = Object.keys(defaultInstruct())
            let samekeys =  filekeys.every((element, index) => {return element === correctkeys[index]})
            if (!samekeys) {
                return FS.deleteAsync(`${FS.documentDirectory}/instruct/${name}.json`).then(() => {
                    throw new TypeError(`JSON file has invalid format`)
                })
            }
            else
                return name
        }).catch(error => ToastAndroid.show(error.message, 2000))
    })
}


// user

export const createNewUser = async (name : string) => {
    return FS.makeDirectoryAsync(`${FS.documentDirectory}persona/${name}`).then(() => {
        return FS.writeAsStringAsync(`${FS.documentDirectory}persona/${name}/${name}.json`, JSON.stringify({
            description: " "
        }), {encoding: FS.EncodingType.UTF8})
    }).catch(() => {console.log(`Could not create user.`)})

}
export const deleteUser = async (name : string) => {
    return FS.deleteAsync( `${FS.documentDirectory}persona/${name}`)
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


export const saveUserCard = async (name : string, card : Object) => {
    return FS.writeAsStringAsync(
        `${FS.documentDirectory}persona/${name}/${name}.json`,
        JSON.stringify(card),
        {encoding: FS.EncodingType.UTF8}
    )
}

export const copyUserImage = async (uri: string, name: string) => {

    return FS.copyAsync({
        from: uri,
        to: getUserImageDirectory(name)
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
		{"name":characterName,"is_user":false,"send_date":humanizedISO8601DateTime(),
            "mes":initmessage
                .replaceAll(`{{char}}`, mmkv.getString(Global.CurrentCharacter))
                .replaceAll(`{{user}}`, mmkv.getString(Global.CurrentUser))
            },
	]
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
    name : string
) => {
    return `${FS.documentDirectory}persona/${name}/${name}.png`
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

export const humanizedISO8601DateTime = (date: string = '') => {
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


export const defaultPresetKAI = () => {
    return {
        "temp": 1,
        "rep_pen": 1,
        "rep_pen_range": 1,
        "top_p": 0.9,
        "top_a": 0.9,
        "top_k": 20,
        "typical": 1,
        "tfs": 1,
        "rep_pen_slope": 0.9,
        "single_line": false,
        "sampler_order": [
            6,
            0,
            1,
            3,
            4,
            2,
            5
        ],
        "mirostat": 0,
        "mirostat_tau": 5,
        "mirostat_eta": 0.1,
        "use_default_badwordsids": true,
        "grammar": "",
        "genamt": 220,
        "max_length": 4096,
        "seed": -1,
    }

}

export const defaultPresetTGWUI = () => {
    return {
        "temp": 0.5,
        "top_p": 0.9,
        "top_k": 0,
        "top_a": 0,
        "tfs": 1,
        "epsilon_cutoff": 0,
        "eta_cutoff": 0,
        "typical_p": 1,
        "rep_pen": 1.1,
        "rep_pen_range": 0,
        "no_repeat_ngram_size": 20,
        "penalty_alpha": 0,
        "num_beams": 1,
        "length_penalty": 1,
        "min_length": 0,
        "encoder_rep_pen": 1,
        "freq_pen": 0,
        "presence_pen": 0,
        "do_sample": true,
        "early_stopping": false,
        "add_bos_token": true,
        "truncation_length": 2048,
        "ban_eos_token": false,
        "skip_special_tokens": true,
        "streaming": true,
        "mirostat_mode": 0,
        "mirostat_tau": 5,
        "mirostat_eta": 0.1,
        "guidance_scale": 1,
        "negative_prompt": "",
        "grammar_string": "",
        "banned_tokens": "",
        "type": "ooba",
        "rep_pen_size": 0,
        "genamt": 256,
        "max_length": 4096
    }
}

export const defaultPresetNovelAI = () => {
    return {
        "temperature": 1.5,
        "repetition_penalty": 2.25,
        "repetition_penalty_range": 2048,
        "repetition_penalty_slope": 0.09,
        "repetition_penalty_frequency": 0,
        "repetition_penalty_presence": 0.005,
        "tail_free_sampling": 0.975,
        "top_k": 10,
        "top_p": 0.75,
        "top_a": 0.08,
        "typical_p": 0.975,
        "min_length": 1,
        "preamble": "[ Style: chat, complex, sensory, visceral ]",
        "cfg_uc": "",
        "banned_tokens": "",
        "order": [
            1,
            5,
            0,
            2,
            3,
            4
        ],
        "logit_bias": [],
        "genamt": 256,
        "max_length": 2560
    }
}

export const defaultInstruct = () => {
    return {
        "system_prompt": "Write {{char}}'s next reply in a roleplay chat between {{char}} and {{user}}.",
        "input_sequence": "### Instruction: ",
        "output_sequence": "### Response: ",
        "first_output_sequence": "",
        "last_output_sequence": "",
        "system_sequence_prefix": "",
        "system_sequence_suffix": "",
        "stop_sequence": "",
        "separator_sequence": "",
        "wrap": false,
        "macro": false,
        "names": false,
        "names_force_groups": false,
        "activation_regex": "",
        "name": "Default"
    }
}
