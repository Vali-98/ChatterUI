import * as FS from 'expo-file-system'
import {MMKV} from 'react-native-mmkv'
import { createContext } from 'react'
import { ToastAndroid, StyleSheet } from 'react-native'
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application'

import { Presets } from './Presets'
import { Instructs } from './Instructs'
import { Users } from './Users'
import { Characters } from './Characters'
import { Chats } from './Chats'

export { Presets, Instructs, Users, Characters, Chats }

export const mmkv = new MMKV()
export const MessageContext = createContext([])

/*
    Partition data
    /globals
        |- index.js
        |- Color
        |- Global
        |- API
        |- Presets
        |- Chars
        |- Chats
        |- Users
        |- Filesystem
    
    globals file becoming too crowded
*/

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

    PresetData = 'presetdata',
    PresetName = 'presetdame',
    
    // APIs

    APIType='endpointtype',             // name of current api mode
    
    KAIEndpoint='kaiendpoint',          // kai api endpoint
    
    TGWUIBlockingEndpoint='tgwuiblockingendpoint',   // tgwui endpoint
    TGWUIStreamingEndpoint='tgwuistreamingendpoint', // tgwui streaming web socket - DEPRECATED

    HordeKey='hordekey',                // api key for horde 
    HordeModels='hordemodel',           // names of horde models to be used
    HordeWorkers = 'hordeworker',       // List of available horde workers

    MancerKey='mancerkey',              // api key for mancer
    MancerModel='mancermodel',          // selected mancer model

    NovelKey='novelkey',                // novelai key
    NovelModel='novelmodel',            // novelai model

    AphroditeKey = 'aphroditekey',      // api key for aphrodite, default is `EMPTY`

    CompletionsEndpoint = 'completionsendpoint',
    CompletionsKey = 'completionskey',
}

export const enum API {
    KAI = 'kai',
    HORDE = 'horde',
    TGWUI = 'textgenwebui',
    MANCER = 'mancer',
    NOVELAI = 'novel',
    APHRODITE = 'aphrodite',
    COMPLETIONS = 'completions'
}

export const GlobalStyle = StyleSheet.create({
    
})

// GENERAL FUNCTIONS

// reencrypts mmkv cache, may not be useful

export const resetEncryption = (value = 0) => {
    mmkv.recrypt(Crypto.getRandomBytes(16).toString())
}

export const resetValues = () => {
    mmkv.set(Global.CurrentCharacter, 'Welcome')
    mmkv.set(Global.CurrentChat, '')
    mmkv.set(Global.NowGenerating, false)
}

// Exports a string to external storage, supports json

export const saveStringExternal = async (
    filename : string,
    filedata : string,
    mimetype = "application/json"
) => {
    const permissions = await FS.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
        let directoryUri = permissions.directoryUri
        await FS.StorageAccessFramework.createFileAsync(directoryUri, filename, mimetype)
        .then(async(fileUri) => {
            await FS.writeAsStringAsync(fileUri, filedata, { encoding: FS.EncodingType.UTF8 })
            ToastAndroid.show(`File saved sucessfully`, 2000)
        })
        .catch((e) => {
            console.log(e)
        })
    }
}

// HEADER FOR REQUESTS

export const hordeHeader = () => {
    return { "Client-Agent":`ChatterUI:${Application.nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`} 
}

// DEFAULT DIRECTORIES

export const generateDefaultDirectories = async () => {

    const dirs = ['characters', 'presets', 'instruct', 'persona']

    dirs.map(async (dir : string)  => {
        await FS.makeDirectoryAsync(`${FS.documentDirectory}${dir}`).catch(() => console.log(`Failed to make directory: ${dir}`))
    })

}


// FORMATS

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

// TODO: create function that loads presets from old files to new one
