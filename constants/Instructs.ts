import { db as database } from '@db'
import { instructs } from 'db/schema'
import { eq } from 'drizzle-orm'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { Llama3Tokenizer } from './Tokenizer/tokenizer'
import { replaceMacros } from './Utils'
import { mmkv, mmkvStorage } from './mmkv'

const defaultInstructs: InstructType[] = [
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '### Instruction: ',
        system_suffix: '\n',
        input_prefix: '### Instruction: ',
        input_suffix: '\n',
        output_prefix: '### Response: ',
        output_suffix: '\n',
        stop_sequence: '### Instruction',
        user_alignment_message: '',
        activation_regex: '',
        wrap: false,
        macro: false,
        names: false,
        names_force_groups: false,
        name: 'Alpaca',
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n',
        system_suffix: '<|eot_id|>',
        input_prefix: '<|start_header_id|>user<|end_header_id|>\n\n',
        input_suffix: '<|eot_id|>',
        output_prefix: '<|start_header_id|>assistant<|end_header_id|>\n\n',
        output_suffix: '<|eot_id|>',
        stop_sequence: '<|eot_id|>',
        user_alignment_message: '',
        activation_regex: '',
        wrap: false,
        macro: false,
        names: false,
        names_force_groups: false,
        name: 'Llama 3',
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<|im_start|>system\n',
        system_suffix: '<|im_end|>\n',
        input_prefix: '<|im_start|>user\n',
        input_suffix: '<|im_end|>\n',
        output_prefix: '<|im_start|>assistant\n',
        output_suffix: '<|im_end|>\n',
        stop_sequence: '<|im_end|>',
        user_alignment_message: '',
        activation_regex: '',
        wrap: false,
        macro: false,
        names: false,
        names_force_groups: false,
        name: 'ChatML',
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<|system|>\n',
        system_suffix: '<|endoftext|>\n',
        input_prefix: '<|user|>\n',
        input_suffix: '<|endoftext|>\n',
        output_prefix: '<|assistant|>\n',
        output_suffix: '<|endoftext|>\n',
        stop_sequence: '<|endoftext|>\n',
        user_alignment_message: '',
        activation_regex: '',
        wrap: false,
        macro: false,
        names: false,
        names_force_groups: false,
        name: 'StableLM-Zephyr',
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<|system|>\n',
        system_suffix: '<|end|>\n',
        input_prefix: '<|user|>\n',
        input_suffix: '<|end|>\n',
        output_prefix: '<|assistant|>\n',
        output_suffix: '<|end|>\n',
        stop_sequence: '<|end|>\n',
        user_alignment_message: '',
        activation_regex: '',
        wrap: false,
        macro: false,
        names: false,
        names_force_groups: false,
        name: 'phi3',
    },
]

type InstructState = {
    data: InstructType | undefined
    load: (id: number) => Promise<void>
    setData: (instruct: InstructType) => void
    tokenCache: InstructTokenCache | undefined
    getCache: (charName: string, userName: string) => InstructTokenCache
    replacedMacros: () => InstructType
}

export type InstructListItem = {
    id: number
    name: string
}

type InstructTokenCache = {
    charName: string
    userName: string
    system_prompt_length: number
    system_prefix_length: number
    system_suffix_length: number
    input_prefix_length: number
    input_suffix_length: number
    output_prefix_length: number
    output_suffix_length: number
    user_alignment_message_length: number
}

export namespace Instructs {
    export const defaultInstruct: InstructType = {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '### Instruction: ',
        system_suffix: '\n',
        input_prefix: '### Instruction: ',
        input_suffix: '\n',
        output_prefix: '### Response: ',
        output_suffix: '\n',
        stop_sequence: '### Instruction',
        user_alignment_message: '',
        activation_regex: '',
        wrap: false,
        macro: false,
        names: false,
        names_force_groups: false,
        name: 'Default',
    }

    export const useInstruct = create<InstructState>()(
        persist(
            (set, get: () => InstructState) => ({
                data: defaultInstructs[0],
                tokenCache: undefined,
                load: async (id: number) => {
                    const data = await db.query.instruct(id)
                    set((state) => ({ ...state, data: data, tokenCache: undefined }))
                    mmkv.set(Global.InstructID, id)
                },
                setData: (instruct: InstructType) => {
                    set((state) => ({ ...state, data: instruct, tokenCache: undefined }))
                },
                getCache: (charName: string, userName: string) => {
                    const cache = get().tokenCache
                    if (cache && cache.charName === charName && cache.userName === userName)
                        return cache
                    const instruct = get().replacedMacros()
                    if (!instruct)
                        return {
                            charName: charName,
                            userName: userName,
                            system_prompt_length: 0,
                            system_prefix_length: 0,
                            system_suffix_length: 0,
                            input_prefix_length: 0,
                            input_suffix_length: 0,
                            output_prefix_length: 0,
                            output_suffix_length: 0,
                            user_alignment_message_length: 0,
                        }
                    const newCache: InstructTokenCache = {
                        charName: charName,
                        userName: userName,
                        system_prompt_length: Llama3Tokenizer.encode(instruct.system_prompt).length,
                        system_prefix_length: Llama3Tokenizer.encode(instruct.system_prefix).length,
                        system_suffix_length: Llama3Tokenizer.encode(instruct.system_suffix).length,
                        input_prefix_length: Llama3Tokenizer.encode(instruct.input_prefix).length,
                        input_suffix_length: Llama3Tokenizer.encode(instruct.input_suffix).length,
                        output_prefix_length: Llama3Tokenizer.encode(instruct.output_prefix).length,
                        output_suffix_length: Llama3Tokenizer.encode(instruct.output_suffix).length,
                        user_alignment_message_length: Llama3Tokenizer.encode(
                            instruct.system_prompt
                        ).length,
                    }
                    set((state) => ({ ...state, tokenCache: newCache }))
                    return newCache
                },
                replacedMacros: () => {
                    const rawinstruct = get().data
                    if (!rawinstruct) {
                        Logger.log('Something wrong happened with Instruct data', true)
                        return Instructs.defaultInstruct
                    }
                    const instruct = { ...rawinstruct }
                    const keys = Object.keys(instruct) as (keyof typeof instruct)[]
                    keys.forEach((key) => {
                        if (typeof instruct[key] === 'string')
                            replaceMacros(instruct[key] as string)
                    })
                    return instruct
                },
            }),
            {
                name: 'instruct-storage',
                storage: createJSONStorage(() => mmkvStorage),
                partialize: (state) => ({ data: state.data }),
            }
        )
    )

    export namespace db {
        export namespace query {
            export const instruct = async (id: number): Promise<InstructType | undefined> => {
                const instruct = await database.query.instructs.findFirst({
                    where: eq(instructs.id, id),
                })
                return instruct
            }

            export const instructList = async (): Promise<InstructListItem[] | undefined> => {
                return await database.query.instructs.findMany({
                    columns: {
                        id: true,
                        name: true,
                    },
                })
            }
        }

        export namespace mutate {
            export const createInstruct = async (instruct: InstructType): Promise<number> => {
                const { id, ...input } = instruct
                const [{ newid }, ...rest] = await database
                    .insert(instructs)
                    .values(input)
                    .returning({ newid: instructs.id })
                return newid
            }

            export const updateInstruct = async (id: number, instruct: InstructType) => {
                await database.update(instructs).set(instruct).where(eq(instructs.id, id))
            }

            export const deleteInstruct = async (id: number) => {
                await database.delete(instructs).where(eq(instructs.id, id))
            }
        }
    }

    export const generateInitialDefaults = async () => {
        const list = await db.query.instructList()
        let data = -1
        defaultInstructs.map(async (item) => {
            if (!list?.some((e) => e.name === item.name)) {
                const newid = await db.mutate.createInstruct(item)
                if (data === -1) data = newid
            }
        })
        Logger.log('Default Instructs Successfully Generated')
        return data === -1 ? 1 : data
    }
}

export type InstructType = {
    id?: number
    name: string
    system_prompt: string
    system_prefix: string
    system_suffix: string
    input_prefix: string
    input_suffix: string
    output_prefix: string
    output_suffix: string
    stop_sequence: string
    activation_regex: string

    user_alignment_message: string
    wrap: boolean
    macro: boolean
    names: boolean
    names_force_groups: boolean
}
