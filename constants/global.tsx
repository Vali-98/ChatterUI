import * as FS from 'expo-file-system'
import { createContext } from 'react'
import { ToastAndroid, StyleSheet } from 'react-native'
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application'

import { Presets } from './Presets'
import { Instructs } from './Instructs'
import { Users } from './Users'
import { Characters } from './Characters'
import { Chats } from './Chats'
import { Global } from './GlobalValues'
import { API } from './API';
import { mmkv } from './mmkv';
import { humanizedISO8601DateTime } from './Utils';

export { mmkv, Presets, Instructs, Users, Characters, Chats, Global, API, humanizedISO8601DateTime }


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



// TODO: create function that loads presets from old files to new one

// Migrate seperated presets from 0.4.2 to unified presets
export const migratePresets = async () => {
       
    FS.readDirectoryAsync(`${FS.documentDirectory}presets/kai`).then(async () => {
        // move all files
        // delete /kai /tgwui /novelai
        const dirs = ['/kai', '/tgwui', '/novelai']
        console.log('Migrating old presets.')
        let count = 1
        dirs.map(async dir => 
        await FS.readDirectoryAsync(`${FS.documentDirectory}presets${dir}`).then(async (files) => {
            let names :  any = []
            files.map(async (file) => {
                if(names.includes(file)){
                    await FS.copyAsync({from: `${FS.documentDirectory}presets${dir}/${file}`, to:`${FS.documentDirectory}presets/${count}-${file}`})
                    count = count + 1
                }   
                else {
                    names.push(file)
                    await FS.copyAsync({from: `${FS.documentDirectory}presets${dir}/${file}`, to:`${FS.documentDirectory}presets/${file}`})
                }
            })
            await FS.deleteAsync(`${FS.documentDirectory}presets${dir}`)
        }))
        console.log('Migration successful.')
    })
    .catch(() => {})
}