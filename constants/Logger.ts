import { Global } from './GlobalValues'
import { humanizedISO8601DateTime } from './Utils'
import { mmkv } from './mmkv'
import Toast from 'react-native-simple-toast'

export namespace Logger {
    const maxloglength = 100

    export const log = (data: string, toast: boolean = false) => {
        const timestamped = `[${humanizedISO8601DateTime()}] : ${data}`
        console.log(timestamped)
        let logs: any = JSON.parse(mmkv.getString(Global.Logs) ?? '[]')
        logs.push(timestamped)
        if (toast) Toast.show(data, 2000)
        if (logs.length > maxloglength) logs.shift()
        mmkv.set(Global.Logs, JSON.stringify(logs))
    }
}
