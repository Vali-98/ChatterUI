import { mmkvStorage } from '@constants/MMKV'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { APIConfiguration, APIValues } from './APIBuilder.types'

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
}

export namespace APIState {
    export const useAPIState = create<APIStateProps>()(
        persist(
            (set, get) => ({
                activeIndex: -1,
                values: [],
                customTemplates: [],
                addValue: (value) => {
                    set((state) => ({
                        ...state,
                        values: [...state.values, { ...value, active: true }],
                    }))
                },
                renameValue: (friendlyName, index) => {},

                addTemplate: (template) => {
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
            }),
            {
                name: 'api-storage',
                storage: createJSONStorage(() => mmkvStorage),
                version: 1,
            }
        )
    )
}
