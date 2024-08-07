import { AppSettings, Global } from './GlobalValues'
import { humanizedISO8601DateTime } from './Utils'
import { mmkv } from './mmkv'
import Toast from 'react-native-simple-toast'

export namespace Logger {
    const maxloglength = 100

    const getLogs = () => {
        return JSON.parse(mmkv.getString(Global.Logs) ?? '[]')
    }

    const insertToLogs = (data: string) => {
        let logs = getLogs()
        logs.push(data)
        if (logs.length > maxloglength) logs.shift()
        mmkv.set(Global.Logs, JSON.stringify(logs))
    }

    export const log = (data: string, toast: boolean = false, toastTime: number = 2000) => {
        const timestamped = `[${new Date().toTimeString().substring(0, 8)}] : ${data}`
        console.log(timestamped)
        insertToLogs(timestamped)
        if (toast) Toast.show(data, toastTime)
    }

    export const debug = (data: string) => {
        if (__DEV__ || mmkv.getBoolean(AppSettings.DevMode)) {
            insertToLogs(data)
            console.log(`[Debug]: `, data)
        }
    }

    export const flushLogs = () => {
        mmkv.set(Global.Logs, '[]')
    }
}
