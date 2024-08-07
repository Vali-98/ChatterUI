//@ts-ignore
import { humanizedISO8601DateTime } from "./Utils"
import * as FS from 'expo-file-system'
import { Global } from "./GlobalValues"
import { API } from "./API"
import { mmkv } from "./mmkv"
import { replaceMacros } from "./Utils"

export namespace Chats {

    const create = (userName : any, characterName : any, card  : any) => {

        const initmessage : string = card?.data?.first_mes ?? card.first_mes

        const newMessage : any = createEntry(characterName, false, replaceMacros(initmessage))

        if(card?.data?.alternate_greetings != undefined && card.data.alternate_greetings.length != 0) {
            newMessage.swipes = []
            newMessage.swipe_info = []
            card.data.alternate_greetings.map((item : any) => {
                newMessage.swipes.push(replaceMacros(item))
                newMessage.swipe_info.push(
                    {
                        "send_date":humanizedISO8601DateTime(),
                        "gen_started":Date(),
                        "gen_finished":Date(),
                        "extra":{"api":"none","model":"none"}
                    }
                )
            })
        }

        return [
            {"user_name":userName,"character_name":characterName,"create_date":humanizedISO8601DateTime(),"chat_metadata":{"note_prompt":"","note_interval":1,"note_position":1,"note_depth":4,"objective":{"currentObjectiveId":0,"taskTree":{"id":0,"description":"","completed":false,"parentId":"","children":[]},"checkFrequency":"3","chatDepth":"2","hideTasks":false,"prompts":{"createTask":"Pause your roleplay and generate a list of tasks to complete an objective. Your next response must be formatted as a numbered list of plain text entries. Do not include anything but the numbered list. The list must be prioritized in the order that tasks must be completed.\n\nThe objective that you must make a numbered task list for is: [{{objective}}].\nThe tasks created should take into account the character traits of {{char}}. These tasks may or may not involve {{user}} directly. Be sure to include the objective as the final task.\n\nGiven an example objective of 'Make me a four course dinner', here is an example output:\n1. Determine what the courses will be\n2. Find recipes for each course\n3. Go shopping for supplies with {{user}}\n4. Cook the food\n5. Get {{user}} to set the table\n6. Serve the food\n7. Enjoy eating the meal with {{user}}\n    ","checkTaskCompleted":"Pause your roleplay. Determine if this task is completed: [{{task}}].\nTo do this, examine the most recent messages. Your response must only contain either true or false, nothing other words.\nExample output:\ntrue\n    ","currentTask":"Your current task is [{{task}}]. Balance existing roleplay with completing this task."}}}},
            newMessage,
        ]
    }
    
    export const createDefault = (
        charName : string,
        userName : string
        ) => {
            console.log(`Creating new chat for character: ${charName} and user: ${userName}`)
            if(charName === 'Welcome')
                return
    
            return FS.readAsStringAsync(
                `${FS.documentDirectory}characters/${charName}/${charName}.json`, 
                {encoding: FS.EncodingType.UTF8})
            .then( response => {
                let card = JSON.parse(response)
                const newmessage = create(userName, charName, card)
            
                return FS.writeAsStringAsync(
                    `${FS.documentDirectory}characters/${charName}/chats/${newmessage[0].create_date}.jsonl`, 
                    newmessage.map((item: any)=> JSON.stringify(item)).join('\u000d\u000a'),
                    {encoding:FS.EncodingType.UTF8}).then(
                        () => {return `${newmessage[0].create_date}.jsonl`})
        }).catch(error => console.log(`Could not create new chat file: ${error}`))
    }
    
    export const getNewest = async (
        charName : string
    ) => {
        let chats = await getFileList(charName)
        return (chats.length === 0) ? await createDefault(charName, mmkv.getString(Global.CurrentUser) ?? '') : chats.at(-1)
    }
    
    export const getFileList = async (
        charName : string
    ) => {
    
        return await FS.readDirectoryAsync(getDir(charName)).catch(() => console.log(`Failed to get chat directory of ${charName}`))
        .then((response : any) => {
            return response
        })
    }
    
    export const getFile = async (
        charName : string,
        chatfilename  : string
    ) => {
        return await FS.readAsStringAsync(getFileDir(charName, chatfilename),{encoding:FS.EncodingType.UTF8}).then((file) => {
            return file.split('\u000d\u000a').map(row => JSON.parse(row))
        }).catch((error) => console.log(`Couldn't load chat file ${chatfilename} for ${charName}: ${error}`))
    }
    
    export const deleteFile = async (
        charName : string,
        chatfilename : string
    ) => {
        return await FS.deleteAsync(getFileDir(charName, chatfilename)).then(() => {
            return getFileList(charName).then(files => {
                if (files.length === 0)
                    return createDefault(charName, mmkv.getString(Global.CurrentUser) ?? '')
            })
        })
    }
    
    export const saveFile = async (
        messages : string[],
        charName : string,
        currentChat : string
    ) => {
        let _charName = (charName === '') ? mmkv.getString(Global.CurrentCharacter) : charName
        let _currentChat = (currentChat === '')? mmkv.getString(Global.CurrentChat) : currentChat
        
        FS.writeAsStringAsync(
            getFileDir(charName, currentChat), 
            messages.map((item)=> JSON.stringify(item)).join('\u000d\u000a'),
            {encoding:FS.EncodingType.UTF8}).catch(error => console.log(`Could not save file! ${error}`))
    }
    
    export const createEntry = (name : String, is_user : boolean, message : String) => {
        let api : any= 'unknown'
        let model : any= 'unknown'
        const apitype = mmkv.getString(Global.APIType)
        switch(apitype) {
            case API.KAI: 
                api = 'kobold'
                break
            case API.TGWUI: 
                api = 'text-generation-webui'
                break
            case API.HORDE:
                api = 'horde'
                model = mmkv.getString(Global.HordeModels)
                break
            case API.MANCER:
                api = 'mancer'
                model = mmkv.getString(Global.MancerModel)
                break
            case API.NOVELAI:
                api = 'novelai'
                model = mmkv.getString(Global.NovelModel)
                break
        }
    
        return {
            // important stuff
            "name":name,
            "is_user":is_user,
            "mes":message,
            // metadata
            "send_date": humanizedISO8601DateTime(),
            "gen_started" : new Date(),
            "gen_finished" : new Date(),
            "extra":{"api":api,"model":model},
            "swipe_id":0,
            "swipes":[message],
            "swipe_info":[
                // metadata
                {	
                    "send_date": humanizedISO8601DateTime(),
                    "extra":{"api":api,"model":model},
                    "gen_started" : new Date(),
                    "gen_finished" : new Date(),
                },
            ],
        }
    }
    
    export const getFileDir = (
        charName : string,
        chatfilename : string
    ) => {
        return `${FS.documentDirectory}characters/${charName}/chats/${chatfilename}`
    }
        
    export const getDir = (
        charName : string
    ) => {
        return `${FS.documentDirectory}characters/${charName}/chats`
    }
}