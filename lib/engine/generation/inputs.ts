import { RNLLAMA_MTMD_DEFAULT_MEDIA_MARKER } from 'cui-llama.rn'

import { AppSettings } from '@lib/constants/GlobalValues'
import { useTextFilterStore } from '@lib/hooks/TextFilter'
import { Characters } from '@lib/state/characters'
import { countCharacterTokens, prepareCharacterTokenText } from '@lib/state/characters/tokenCache'
import { Chats, type ChatMessage } from '@lib/state/chat'
import {
    commonStopStrings,
    Instructs,
    type InstructTokenCache,
    type InstructType,
} from '@lib/state/Instructs'
import { getCurrentSampler } from '@lib/state/samplerStore'
import { mmkv } from '@lib/storage/MMKV'
import { applyMacros, createMacroValues } from '@lib/utils/Macros'

import { useConnectionStore } from '../API/connectionStore'
import { getDataSources } from '../DataSources'
import { Llama } from '../Local/LlamaLocal'
import { Tokenizer } from '../Tokenizer'

// Configuration/database payloads contain plain values and Dates. Keep this portable to Hermes.
const copyInputs = <T>(value: T): T => {
    if (value instanceof Date) return new Date(value.getTime()) as T
    if (Array.isArray(value)) return value.map(copyInputs) as T
    if (value && typeof value === 'object')
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, copyInputs(item)])
        ) as T
    return value
}

// All selection/configuration reads happen synchronously, before preparation awaits anything.
export const captureGenerationInputs = (chatId: number, mode: 'remote' | 'local') => {
    const connectionState = useConnectionStore.getState()
    const connection = connectionState.connections.find(
        (item) => item.id === connectionState.activeConnectionId
    )
    const template = connectionState
        .getTemplates()
        .find((item) => item.name === connection?.configName)
    if (mode === 'remote' && (!connection || !template))
        throw new Error('No active connection configuration')
    const rawInstruct = copyInputs(
        Instructs.useInstruct.getState().data ?? Instructs.defaultInstruct
    )
    const includeReasoning =
        !rawInstruct.hide_think_tags &&
        (mode === 'local' || template?.request.completionType.type === 'textCompletions')
    const chat = Chats.db.live.chat(chatId, { includeReasoning }).sync()
    if (!chat) throw new Error('Chat no longer exists')
    const character = Characters.db.live.card(chat.character_id).sync()
    const user = Characters.useUserStore.getState().card
    if (!character || !user) throw new Error('Generation requires a character and user card')
    const macros = createMacroValues({ char: character.name, user: user.name }, new Date())
    const instruct = Object.fromEntries(
        Object.entries(rawInstruct).map(([key, value]) => [
            key,
            typeof value === 'string' && key !== 'system_prompt_format'
                ? applyMacros(value, macros)
                : value,
        ])
    ) as InstructType
    const stopSequence = [
        ...(instruct.names ? [`${user.name} :`, `${character.name} :`] : []),
        ...instruct.stop_sequence.split(',').filter(Boolean),
        ...(instruct.use_common_stop ? commonStopStrings : []),
    ]
    const { sendFilteredText, filter } = useTextFilterStore.getState()
    const model = Tokenizer.useTokenizerState.getState().model
    const remoteTokenizer = async (text: string, images: string[] = []) =>
        (model ? (await model.tokenize(text)).tokens.length : 0) + images.length * 512
    let activateLocalTokenizer = () => {}
    let localTokenizer = Llama.useLlamaModelStore.getState().tokenLength
    const tokenizerReady =
        mode === 'local'
            ? new Promise<void>((resolve) => {
                  activateLocalTokenizer = () => {
                      const { context, mmproj } = Llama.useLlamaModelStore.getState()
                      localTokenizer = async (text: string, images: string[] = []) => {
                          const paths = mmproj ? images : []
                          const result = await context?.tokenize(
                              text + paths.map(() => RNLLAMA_MTMD_DEFAULT_MEDIA_MARKER).join(),
                              {
                                  media_paths: paths.map((path) => path.replace('file://', '')),
                              }
                          )
                          return result?.tokens.length ?? 0
                      }
                      resolve()
                  }
              })
            : Promise.resolve()
    const tokenizer =
        mode === 'remote'
            ? remoteTokenizer
            : async (text: string, images?: string[]) => {
                  await tokenizerReady
                  return localTokenizer(text, images)
              }
    const dataSources = getDataSources(chatId, { macros, tokenizer })
    // Preparation consumes the rejection; attachment copying/model loading may still be pending.
    void dataSources.catch(() => {})
    return {
        includeReasoning: includeReasoning,
        chatId: chatId,
        mode: mode,
        character: copyInputs(character),
        user: copyInputs(user),
        messages: copyInputs(chat.messages) as ChatMessage[],
        instruct: instruct,
        macros: macros,
        samplers: copyInputs(getCurrentSampler()),
        apiValues: connection ? copyInputs(connection) : undefined,
        apiConfig: template ? copyInputs(template) : undefined,
        textFilter: { sendFilteredText: sendFilteredText, filter: [...filter] },
        tokenizer: tokenizer,
        activateLocalTokenizer: activateLocalTokenizer,
        localConfig: copyInputs(Llama.useLlamaPreferencesStore.getState().config),
        localModel: Llama.useLlamaModelStore.getState().model,
        lastLocalModel: Llama.useLlamaPreferencesStore.getState().lastModel,
        autoLoadLocal: !!mmkv.getBoolean(AppSettings.AutoLoadLocal),
        useModelTemplate: !!mmkv.getBoolean(AppSettings.UseModelTemplate),
        saveLocalKV: !!mmkv.getBoolean(AppSettings.SaveLocalKV),
        autoTitle: !!mmkv.getBoolean(AppSettings.AutoGenerateTitle),
        bypassContextLength: !!mmkv.getBoolean(AppSettings.BypassContextLength),
        stopSequence: stopSequence,
        dataSources: dataSources,
    }
}
export type GenerationInputs = ReturnType<typeof captureGenerationInputs>

export const prepareGenerationContext = async (inputs: GenerationInputs) => {
    const { character, user, tokenizer, instruct, macros } = inputs
    const [characterCounts, userCounts] = await Promise.all([
        countCharacterTokens(prepareCharacterTokenText(character, macros), {
            otherParticipantName: user.name,
            tokenizer: tokenizer,
        }),
        countCharacterTokens(prepareCharacterTokenText(user, macros), {
            otherParticipantName: character.name,
            tokenizer: tokenizer,
        }),
    ])
    const instructCache: InstructTokenCache = {
        characterName: character.name,
        userName: user.name,
        system_prompt_length: await tokenizer(instruct.system_prompt),
        system_prefix_length: await tokenizer(instruct.system_prefix),
        system_suffix_length: await tokenizer(instruct.system_suffix),
        input_prefix_length: await tokenizer(instruct.input_prefix),
        input_suffix_length: await tokenizer(instruct.input_suffix),
        output_prefix_length: await tokenizer(instruct.output_prefix),
        last_output_prefix_length: await tokenizer(instruct.last_output_prefix),
        output_suffix_length: await tokenizer(instruct.output_suffix),
        user_alignment_message_length: await tokenizer(instruct.user_alignment_message),
    }
    return {
        character: character,
        user: user,
        instruct: instruct,
        macros: macros,
        textFilter: inputs.textFilter,
        bypassContextLength: inputs.bypassContextLength,
        messages: copyInputs(inputs.messages),
        tokenizer: tokenizer,
        includeInlineReasoning: inputs.mode === 'local',
        chatTokenizer: (message: ChatMessage) =>
            Chats.actions.countMessageTokens(message, tokenizer),
        cache: { characterCounts, userCounts, instructCache },
        dataSources: await inputs.dataSources,
    }
}
