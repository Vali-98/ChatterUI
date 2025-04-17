import { Storage } from '@lib/enums/Storage'
import Toast from 'react-native-simple-toast'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { AppSettings } from '../constants/GlobalValues'
import { mmkv, mmkvStorage } from '../storage/MMKV'
import { Theme } from '@lib/theme/ThemeManager'

const toastTime = Toast.SHORT
const maxloglength = 2000

export enum LogLevel {
    INFO,
    WARN,
    ERROR,
    DEBUG,
}

type LogEntry = {
    timestamp: string
    message: string
    level: LogLevel
}

type LogStateProps = {
    logs: LogEntry[]
    addLog: (entry: LogEntry) => void
    flushLogs: () => void
}

export namespace Logger {
    export const useLoggerState = create<LogStateProps>()(
        persist(
            (set, get) => ({
                logs: [],
                addLog: (entry) => {
                    const newlogs = [...get().logs, entry]
                    if (newlogs.length > maxloglength) newlogs.shift()
                    set((state) => ({ ...state, logs: newlogs }))
                },
                flushLogs: () => {
                    set((state) => ({ ...state, logs: [] }))
                },
            }),
            {
                name: Storage.Logs,
                storage: createJSONStorage(() => mmkvStorage),
                version: 1,
                partialize: (state) => ({
                    logs: state.logs,
                }),
                migrate: async (persistedState: any, version) => {
                    //no migrations yet
                },
            }
        )
    )

    export const LevelName: Record<LogLevel, string> = {
        [LogLevel.INFO]: '[INFO]',
        [LogLevel.WARN]: '[WARN]',
        [LogLevel.ERROR]: '[ERROR]',
        [LogLevel.DEBUG]: '[DEBUG]',
    }

    const insertLogs = (data: LogEntry) => {
        useLoggerState.getState().addLog(data)
    }

    const createLog = (data: string, level: LogLevel): LogEntry => {
        const timestamp = `[${new Date().toTimeString().substring(0, 8)}]`
        return { timestamp: timestamp, message: data, level: level }
    }

    const printLog = (log: LogEntry) => {
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
        Toast.show(data, toastTime, { textColor: 'yellow' })
    }

    export const error = (data: string) => {
        const logItem = createLog(data, LogLevel.ERROR)
        printLog(logItem)
        insertLogs(logItem)
    }

    export const errorToast = (data: string) => {
        error(data)
        Toast.show(data, toastTime, { textColor: 'red' })
    }

    export const debug = (data: string) => {
        if (!__DEV__ && !mmkv.getBoolean(AppSettings.DevMode)) return
        const logItem = createLog(data, LogLevel.DEBUG)
        printLog(logItem)
        insertLogs(logItem)
    }

    export const debugToast = (data: string) => {
        error(data)
        Toast.show(data, toastTime, {
            textColor: 'blue',
        })
    }
}

