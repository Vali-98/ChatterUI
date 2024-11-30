import Toast from 'react-native-simple-toast'

import { AppSettings, Global } from './GlobalValues'
import { mmkv } from './MMKV'

export namespace Logger {
    const toastTime = 2000

    export enum LogLevel {
        INFO,
        WARN,
        ERROR,
        DEBUG,
    }

    const LevelName: Record<LogLevel, string> = {
        [LogLevel.INFO]: '[INFO]',
        [LogLevel.WARN]: '[WARN]',
        [LogLevel.ERROR]: '[ERROR]',
        [LogLevel.DEBUG]: '[DEBUG]',
    }

    type Log = {
        timestamp: string
        message: string
        level: LogLevel
    }

    const maxloglength = 300

    const getLogs = () => {
        return JSON.parse(mmkv.getString(Global.Logs) ?? '[]')
    }

    const insertToLogs = (data: string) => {
        const logs = getLogs()
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

    // new api

    const insertLogs = (data: Log) => {
        const logs = getLogs()
        logs.push(data)
        if (logs.length > maxloglength) logs.shift()
        mmkv.set(Global.Logs, JSON.stringify(logs))
    }

    const createLog = (data: string, level: LogLevel): Log => {
        const timestamp = `[${new Date().toTimeString().substring(0, 8)}]`
        return { timestamp: timestamp, message: data, level: level }
    }

    const printLog = (log: Log) => {
        console.log(`${LevelName[log.level]}${log.timestamp}: ${log.message}`)
    }

    export const info = (data: string) => {
        const logItem = createLog(data, LogLevel.INFO)
        printLog(logItem)
        insertLogs(logItem)
    }

    export const infoToast = (data: string) => {
        info(data)
        Toast.show(data, toastTime)
    }

    export const warn = (data: string) => {
        const logItem = createLog(data, LogLevel.WARN)
        printLog(logItem)
        insertLogs(logItem)
    }

    export const warnToast = (data: string) => {
        warn(data)
        Toast.show(data, toastTime)
    }

    export const error = (data: string) => {
        const logItem = createLog(data, LogLevel.ERROR)
        printLog(logItem)
        insertLogs(logItem)
    }

    export const errorToast = (data: string) => {
        error(data)
        Toast.show(data, toastTime)
    }

    export const newDebug = (data: string) => {
        const logItem = createLog(data, LogLevel.DEBUG)
        printLog(logItem)
        insertLogs(logItem)
    }

    export const debugToast = (data: string) => {
        error(data)
        Toast.show(data, toastTime)
    }
}
