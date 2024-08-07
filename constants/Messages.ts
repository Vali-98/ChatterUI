import { API } from './API'
import { Global } from './GlobalValues'
import { Instruct } from './Instructs'
import { Logger } from './Logger'
import { humanizedISO8601DateTime } from './Utils'
import { mmkv } from './mmkv'
import { create } from 'zustand'
export namespace Messages {
    export const set = (data: Array<any>) => {
        mmkv.set(Global.Messages, JSON.stringify(data))
    }

    export const useBuffer = create((set) => ({
        buffer: '',
        setBuffer: (newBuffer: string) => set({ buffer: newBuffer }),
        insertBuffer: (data: string) => set((state: any) => ({ buffer: state.buffer + data })),
    }))

    export const insert = (
        data: string,
        charName: string,
        userName: string,
        currentInstruct: Instruct
    ) => {
        try {
            const messages = JSON.parse(mmkv.getString(Global.Messages) ?? ``)
            if (!messages || !currentInstruct || !charName || !userName) {
                Logger.log(`Insertion Error`, true)
                return
            }

            const mescontent = (messages.at(-1).mes + data)
                .replaceAll(currentInstruct.input_sequence, ``)
                .replaceAll(currentInstruct.output_sequence, ``)
                .replaceAll(currentInstruct.stop_sequence, '')
                .replaceAll(userName + ':', '')
                .replaceAll(charName + ':', '')
            const newmessage = messages.at(-1)
            newmessage.mes = mescontent
            newmessage.swipes[newmessage.swipe_id] = mescontent
            newmessage.gen_finished = Date()
            newmessage.swipe_info[newmessage.swipe_id].gen_finished = Date()
            const finalized_messages = [...messages.slice(0, -1), newmessage]
            mmkv.set(Global.Messages, JSON.stringify(finalized_messages))
            return finalized_messages
        } catch (error) {
            console.log(error)
        }
    }

    export const createEntry = (name: string, is_user: boolean, message: string) => {
        let api: any = 'unknown'
        let model: any = 'unknown'
        const apitype = mmkv.getString(Global.APIType)
        switch (apitype) {
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
            default:
                api = 'unknown'
                model = 'unknown'
        }

        return {
            // important stuff
            name,
            is_user,
            mes: message,
            // metadata
            send_date: humanizedISO8601DateTime(),
            gen_started: new Date(),
            gen_finished: new Date(),
            extra: { api, model },
            swipe_id: 0,
            swipes: [message],
            swipe_info: [
                // metadata
                {
                    send_date: humanizedISO8601DateTime(),
                    extra: { api, model },
                    gen_started: new Date(),
                    gen_finished: new Date(),
                },
            ],
        }
    }

    export const insertEntry = (name: string, is_user: boolean, message: string) => {
        const messages = JSON.parse(mmkv.getString(Global.Messages) ?? ``)
        if (!messages) return
        const newmessages = [...messages, createEntry(name, is_user, message)]
        mmkv.set(Global.Messages, JSON.stringify(newmessages))
        return newmessages
    }

    export const insertUserEntry = (message: string = '') => {
        const userName = mmkv.getString(Global.CurrentUser)
        return insertEntry(userName ?? '', true, message)
    }

    export const insertCharacterEntry = (message: string = '') => {
        const charName = mmkv.getString(Global.CurrentCharacter)
        return insertEntry(charName ?? '', true, message)
    }

    export const insertFromBuffer = () => {
        //@ts-ignore
        const buffer = useBuffer.getState().buffer
        updateLastEntry(buffer)
    }

    export const deleteEntry = (index: number, range: number = 1) => {
        const messages = JSON.parse(mmkv.getString(Global.Messages) ?? ``)
        if (!messages) return
        messages.splice(index, 1)
        mmkv.set(Global.Messages, JSON.stringify(messages))
        return messages
    }

    export const updateEntry = (index: number, data: string) => {
        let messages = JSON.parse(mmkv.getString(Global.Messages) ?? ``)
        if (!messages) return
        messages.at(index).mes = data
        messages.at(index).swipes[messages.at(index).swipe_id] = data
        mmkv.set(Global.Messages, JSON.stringify(messages))
        return messages
    }

    export const updateLastEntry = (data: string) => {
        let messages = JSON.parse(mmkv.getString(Global.Messages) ?? ``)
        if (!messages) return
        const index = messages.length - 1
        messages.at(index).mes = data
        messages.at(index).swipes[messages.at(index).swipe_id] = data
        mmkv.set(Global.Messages, JSON.stringify(messages))
        return messages
    }

    export const swipeRight = (id: number) => {
        return swipe(id, 1)
    }

    export const swipeLeft = (id: number) => {
        return swipe(id, -1)
    }

    export const swipe = (id: number, offset: number) => {
        let messages = JSON.parse(mmkv.getString(Global.Messages) ?? ``)
        if (!messages) return false
        const swipeid = messages[id].swipe_id + offset
        let message = messages.at(id)
        if (swipeid < 0) return false
        if (swipeid > message.swipes.length - 1) return true
        const new_swipe = message.swipes.at(swipeid)
        const new_info = message.swipe_info.at(swipeid)
        message = {
            ...message,
            mes: new_swipe,
            ...new_info,
            swipe_id: swipeid,
        }
        messages[id] = message
        mmkv.set(Global.Messages, JSON.stringify(messages))
        return false
    }

    export const addSwipe = (id: number) => {
        let messages = JSON.parse(mmkv.getString(Global.Messages) ?? ``)
        if (!messages) return false
        messages.at(id).mes = ''
        messages.at(id).swipes.push(``)
        messages.at(id).swipe_info.push({
            send_date: humanizedISO8601DateTime(),
            gen_started: Date(),
            gen_finished: Date(),
            extra: messages.at(id).extra,
        })
        //messages.at(id).send_date = humanizedISO8601DateTime()
        messages.at(id).gen_started = Date()
        messages.at(id).gen_finished = Date()
        messages.at(id).swipe_id = messages.at(id).swipe_id + 1
        mmkv.set(Global.Messages, JSON.stringify(messages))
    }
}
