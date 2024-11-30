import { Logger } from '@constants/Logger'
import { mmkvStorage } from 'constants/MMKV'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { APIConfiguration, APIValues } from './APIBuilder.types'
import { defaultTemplates } from './DefaultAPI'

export interface APIManagerValue extends APIValues {
    active: boolean
    friendlyName: string
}

type APIStateProps = {
    activeIndex: number
    values: APIManagerValue[]
    customTemplates: APIConfiguration[]
    addValue: (template: APIManagerValue) => void
    renameValue: (friendlyName: string, index: number) => void
    addTemplate: (values: APIConfiguration) => void
    removeValue: (index: number) => void
    removeTemplate: (index: number) => void
    editValue: (value: APIManagerValue, index: number) => void
    getTemplates: () => APIConfiguration[]
}

export namespace APIState {
    export const useAPIState = create<APIStateProps>()(
        persist(
            (set, get) => ({
                activeIndex: -1,
                values: [],
                customTemplates: [],
                addValue: (value) => {
                    const values = get().values
                    values.forEach((item) => (item.active = false))
                    values.push(value)
                    set((state) => ({
                        ...state,
                        values: values,
                    }))
                },
                renameValue: (friendlyName, index) => {},

                addTemplate: (template) => {
                    const templates = get().getTemplates()
                    if (templates.some((item) => item.name === template.name)) {
                        const newName = generateUniqueName(
                            template.name,
                            templates.map((item) => item.name)
                        )
                        Logger.log(`Name exists, renaming to: ${newName}`)
                        template.name = newName
                    }
                    set((state) => ({
                        ...state,
                        customTemplates: [...state.customTemplates, template],
                    }))
                },
                removeValue: (index) => {
                    const values = get().values
                    values.splice(index, 1)
                    set((state) => ({ ...state, values: values }))
                },
                removeTemplate: (index) => {
                    const templates = get().customTemplates
                    templates.splice(index, 1)
                    set((state) => ({ ...state, customTemplates: templates }))
                },
                editValue: (newValue, index) => {
                    const values = get().values
                    const oldValue = values[index]
                    values[index] = newValue
                    let active = {}
                    if (newValue.active && !oldValue.active) {
                        values.forEach((item, newindex) => {
                            item.active = newindex === index
                        })
                        active = { activeIndex: index }
                    }
                    if (!newValue.active && oldValue.active) {
                        active = { activeIndex: -1 }
                    }
                    set((state) => ({ ...state, values: values, ...active }))
                },
                getTemplates: () => {
                    return [...get().customTemplates, ...defaultTemplates]
                },
            }),
            {
                name: 'api-storage',
                storage: createJSONStorage(() => mmkvStorage),
                version: 1,
            }
        )
    )
}

// recursively fill json in case it is incorrect
const verifyJSON = (source: any, target: any): any => {
    const fillFields = (sourceObj: any, targetObj: any): any => {
        if (typeof sourceObj !== 'object' || sourceObj === null) {
            sourceObj = Array.isArray(targetObj) ? [] : {}
        }
        for (const key of Object.keys(targetObj)) {
            if (!(key in sourceObj)) {
                sourceObj[key] = targetObj[key]
            } else if (typeof targetObj[key] === 'object' && targetObj[key] !== null) {
                sourceObj[key] = fillFields(sourceObj[key], targetObj[key])
            }
        }
        return sourceObj
    }
    return fillFields(source, target)
}

// todo move to file utils

function generateUniqueName(baseName: string, names: string[]) {
    const regex = new RegExp(`^${baseName}\\s\\((\\d+)\\)$`)
    const existingNumbers = names
        .map((item) => {
            const match = item.match(regex)
            return match ? parseInt(match[1], 10) : null
        })
        .filter((num) => num !== null)
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
    return `${baseName} (${nextNumber})`
}
