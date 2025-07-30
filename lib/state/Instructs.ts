import { db as database } from '@db'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { Storage } from '@lib/enums/Storage'
import { instructs } from 'db/schema'
import { eq } from 'drizzle-orm'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { replaceMacros } from '../state/Macros'
import { createMMKVStorage } from '../storage/MMKV'
import { Characters } from './Characters'
import { Logger } from './Logger'

export const defaultSystemPromptFormat =
    '{{system_prefix}}{{system_prompt}}\n{{character_desc}}\n{{personality}}\n{{scenario}}\n{{user_desc}}{{system_suffix}}'

const defaultGenerics = {
    wrap: false,
    macro: false,
    names: false,
    names_force_groups: false,
    timestamp: false,
    examples: true,
    format_type: 0,
    scenario: true,
    personality: true,
    hide_think_tags: true,
    use_common_stop: true,
    send_images: true,
    send_audio: true,
    send_documents: true,
    last_image_only: true,
    system_prompt_format: defaultSystemPromptFormat,
}

const defaultInstructs: InstructType[] = [
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<|im_start|>system\n',
        system_suffix: '<|im_end|>\n',
        input_prefix: '<|im_start|>user\n',
        input_suffix: '<|im_end|>\n',
        output_prefix: '<|im_start|>assistant\n',
        last_output_prefix: '<|im_start|>assistant\n',
        output_suffix: '<|im_end|>\n',
        stop_sequence: '<|im_end|>',
        user_alignment_message: '',
        activation_regex: '',
        name: 'ChatML',
        ...defaultGenerics,
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '### Instruction: ',
        system_suffix: '\n',
        input_prefix: '### Instruction: ',
        input_suffix: '\n',
        output_prefix: '### Response: ',
        last_output_prefix: '### Response: ',
        output_suffix: '\n',
        stop_sequence: '### Instruction',
        user_alignment_message: '',
        activation_regex: '',
        name: 'Alpaca',
        ...defaultGenerics,
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<|start_header_id|>system<|end_header_id|>\n\n',
        system_suffix: '<|eot_id|>',
        input_prefix: '<|start_header_id|>user<|end_header_id|>\n\n',
        input_suffix: '<|eot_id|>',
        output_prefix: '<|start_header_id|>assistant<|end_header_id|>\n\n',
        last_output_prefix: '<|start_header_id|>assistant<|end_header_id|>\n\n',
        output_suffix: '<|eot_id|>',
        stop_sequence: '<|eot_id|>',
        user_alignment_message: '',
        activation_regex: '',
        name: 'Llama 3',
        ...defaultGenerics,
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<|system|>\n',
        system_suffix: '<|endoftext|>\n',
        input_prefix: '<|user|>\n',
        input_suffix: '<|endoftext|>\n',
        output_prefix: '<|assistant|>\n',
        last_output_prefix: '<|assistant|>\n',
        output_suffix: '<|endoftext|>\n',
        stop_sequence: '<|endoftext|>',
        user_alignment_message: '',
        activation_regex: '',
        name: 'StableLM-Zephyr',
        ...defaultGenerics,
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<|system|>\n',
        system_suffix: '<|end|>\n',
        input_prefix: '<|user|>\n',
        input_suffix: '<|end|>\n',
        output_prefix: '<|assistant|>\n',
        last_output_prefix: '<|assistant|>\n',
        output_suffix: '<|end|>\n',
        stop_sequence: '<|end|>',
        user_alignment_message: '',
        activation_regex: '',
        name: 'phi3',
        ...defaultGenerics,
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '<start_of_turn>user\n',
        system_suffix: '<end_of_turn>\n',
        input_prefix: '<start_of_turn>user\n',
        input_suffix: '<end_of_turn>\n',
        output_prefix: '<start_of_turn>model\n',
        last_output_prefix: '<start_of_turn>model\n',
        output_suffix: '<end_of_turn>\n',
        stop_sequence: '<end_of_turn>',
        user_alignment_message: '',
        activation_regex: '',
        name: 'Gemma 2',
        ...defaultGenerics,
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '',
        system_suffix: '',
        input_prefix: '[INST]',
        input_suffix: '',
        output_prefix: '[/INST]',
        last_output_prefix: '[/INST]',
        output_suffix: '</s>',
        stop_sequence: '</s>',
        user_alignment_message: '',
        activation_regex: '',
        name: 'Mistral V1',
        ...defaultGenerics,
    },
    {
        system_prompt: "Write {{char}}'s next reply in a chat between {{char}} and {{user}}.",
        system_prefix: '',
        system_suffix: '',
        input_prefix: '<｜User｜>',
        input_suffix: '',
        output_prefix: '<｜Assistant｜>',
        last_output_prefix: '<｜Assistant｜>',
        output_suffix: '<｜end▁of▁sentence｜>',
        stop_sequence: '<｜end▁of▁sentence｜>',
        user_alignment_message: '',
        activation_regex: 'deepseek',
        name: 'DeepSeek-R1',
        ...defaultGenerics,
    },
]

;('<|im_start|>assistant')

export const outputPrefixes = defaultInstructs
    .map((item) => item.output_prefix)
    .filter((item) => !!item)

export const commonStopStrings = [
    '</s>',
    '<|end|>',
    '<|eot_id|>',
    '<|end_of_text|>',
    '<|im_end|>',
    '<|EOT|>',
    '<|END_OF_TURN_TOKEN|>',
    '<|end_of_turn|>',
    '<|endoftext|>',
    '<end_of_turn>',
    '<eos>',
    '<｜end▁of▁sentence｜>',
]

type InstructState = {
    data: InstructType | undefined
    load: (id: number) => Promise<void>
    setData: (instruct: InstructType) => void
    tokenCache: InstructTokenCache | undefined
    getCache: (charName: string, userName: string) => Promise<InstructTokenCache>
    replacedMacros: () => InstructType
    getStopSequence: () => string[]
}

export type InstructListItem = {
    id: number
    name: string
}

export type InstructTokenCache = {
    charName: string
    userName: string
    system_prompt_length: number
    system_prefix_length: number
    system_suffix_length: number
    input_prefix_length: number
    input_suffix_length: number
    output_prefix_length: number
    last_output_prefix_length: number
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
        last_output_prefix: '### Response: ',
        output_suffix: '\n',
        stop_sequence: '### Instruction',
        user_alignment_message: '',
        activation_regex: '',
        name: 'Default',
        ...defaultGenerics,
    }

    export const useInstruct = create<InstructState>()(
        persist(
            (set, get: () => InstructState) => ({
                data: defaultInstructs[0],
                tokenCache: undefined,
                load: async (id: number) => {
                    const data = await db.query.instruct(id)
                    set((state) => ({ ...state, data: data, tokenCache: undefined }))
                },
                setData: (instruct: InstructType) => {
                    set((state) => ({ ...state, data: instruct, tokenCache: undefined }))
                },
                getCache: async (charName: string, userName: string) => {
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
                            last_output_prefix_length: 0,
                            output_suffix_length: 0,
                            user_alignment_message_length: 0,
                        }
                    const getTokenCount = Tokenizer.getTokenizer()

                    const newCache: InstructTokenCache = {
                        charName: charName,
                        userName: userName,
                        system_prompt_length: await getTokenCount(instruct.system_prompt),
                        system_prefix_length: await getTokenCount(instruct.system_prefix),
                        system_suffix_length: await getTokenCount(instruct.system_suffix),
                        input_prefix_length: await getTokenCount(instruct.input_prefix),
                        input_suffix_length: await getTokenCount(instruct.input_suffix),
                        output_prefix_length: await getTokenCount(instruct.output_prefix),
                        last_output_prefix_length: await getTokenCount(instruct.last_output_prefix),
                        output_suffix_length: await getTokenCount(instruct.output_suffix),
                        user_alignment_message_length: await getTokenCount(instruct.system_prompt),
                    }
                    set((state) => ({ ...state, tokenCache: newCache }))
                    return newCache
                },
                replacedMacros: () => {
                    const baseInstruct = get().data

                    if (!baseInstruct) {
                        Logger.errorToast('Something wrong happened with Instruct data')
                        return Instructs.defaultInstruct
                    }

                    const instruct: InstructType = {
                        ...baseInstruct,
                        system_prompt: replaceMacros(baseInstruct.system_prompt),
                        system_prefix: replaceMacros(baseInstruct.system_prefix),
                        system_suffix: replaceMacros(baseInstruct.system_suffix),
                        input_prefix: replaceMacros(baseInstruct.input_prefix),
                        input_suffix: replaceMacros(baseInstruct.input_suffix),
                        output_prefix: replaceMacros(baseInstruct.output_prefix),
                        last_output_prefix: replaceMacros(baseInstruct.last_output_prefix),
                        output_suffix: replaceMacros(baseInstruct.output_suffix),
                        user_alignment_message: replaceMacros(baseInstruct.system_prompt),
                        stop_sequence: replaceMacros(baseInstruct.stop_sequence),
                    }

                    return instruct
                },
                getStopSequence: () => {
                    const instruct = get().replacedMacros()
                    const sequence: string[] = []
                    let extras: string[] = []
                    if (instruct.names) {
                        const userName = Characters.useCharacterStore.getState().card?.name
                        const charName = Characters.useCharacterStore.getState()?.card?.name
                        if (userName) sequence.push(`${userName} :`)
                        if (charName) sequence.push(`${charName} :`)
                    }

                    if (instruct.stop_sequence !== '')
                        instruct.stop_sequence
                            .split(',')
                            .forEach((item) => item !== '' && sequence.push(item))

                    if (instruct.use_common_stop) {
                        extras = [...extras, ...commonStopStrings]
                    }

                    return [...sequence, ...extras]
                },
            }),
            {
                name: Storage.Instruct,
                storage: createMMKVStorage(),
                partialize: (state) => ({ data: state.data }),
                version: 7,
                migrate: async (persistedState: any, version) => {
                    if (!version) {
                        persistedState.data.timestamp = false
                        persistedState.data.examples = true
                        persistedState.data.format_type = 0
                        Logger.info('[INSTRUCT] Migrated to v1')
                    }
                    if (version === 1) {
                        persistedState.data.last_output_prefix = persistedState.data.output_prefix
                        const entries = await database.query.instructs.findMany({
                            columns: {
                                id: true,
                                output_prefix: true,
                            },
                        })
                        entries.forEach(async (item) => {
                            await database
                                .update(instructs)
                                .set({ last_output_prefix: item.output_prefix })
                                .where(eq(instructs.id, item.id))
                        })

                        Logger.info('[INSTRUCT] Migrated to v2')
                    }
                    if (version === 2) {
                        persistedState.data.scenario = true
                        persistedState.data.personality = true
                    }

                    if (version === 3) {
                        persistedState.data.hide_think_tags = true
                    }

                    if (version === 4) {
                        persistedState.data.use_common_stop = true
                    }

                    if (version === 5) {
                        persistedState.data.send_images = true
                        persistedState.data.send_audio = true
                        persistedState.data.send_documents = true
                        persistedState.data.last_image_only = true
                    }

                    if (version === 6) {
                        persistedState.data.system_prompt_format = defaultSystemPromptFormat
                    }

                    return persistedState
                },
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

            export const instructListQuery = () => {
                return database.query.instructs.findMany({
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
        Logger.info('Default Instructs Successfully Generated')
        return data === -1 ? 1 : data
    }
}

export type InstructType = Omit<typeof instructs.$inferSelect, 'id'> & { id?: number }
