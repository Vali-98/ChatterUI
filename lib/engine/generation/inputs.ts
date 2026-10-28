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
import { summaryList } from '@lib/summaries/db'
import { summarizeHistory, usableSummariesBefore } from '@lib/summaries/history'
import { useSummarySettingsStore } from '@lib/summaries/settingsStore'
import { applyMacros, createMacroValues } from '@lib/utils/Macros'

import {
    captureHistory,
    createHistoryReader,
    generationHistoryCutoff,
    type GenerationHistory,
} from './history'
import { recordContextStats } from './contextStatsState'
import { useConnectionStore } from '../API/connectionStore'
import { collectContext } from '../API/ContextBuilder'
import { defaultTemplates } from '../API/DefaultAPI'
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

// Capture selections/configuration and the history boundary before preparation awaits anything.
// Older messages are fetched in bounded batches while building context.
export const captureGenerationInputs = (
    chatId: number,
    mode: 'remote' | 'local',
    options: { includeDataSources?: boolean; includeSummaries?: boolean; history?: 'full' } = {}
) => {
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
    const chat = Chats.db.query.chatRow(chatId)
    if (!chat) throw new Error('Chat no longer exists')
    const captured =
        options.history === 'full'
            ? {
                  messages: Chats.db.live.chat(chatId, { includeReasoning }).sync()?.messages ?? [],
                  history: undefined as GenerationHistory | undefined,
              }
            : captureHistory(chatId, includeReasoning)
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
    const dataSources =
        options.includeDataSources === false
            ? Promise.resolve([])
            : getDataSources(chatId, { macros, tokenizer })
    // Preparation consumes the rejection; attachment copying/model loading may still be pending.
    void dataSources.catch(() => {})
    return {
        summaries:
            options.includeSummaries !== false && useSummarySettingsStore.getState().enabled
                ? summaryList(chatId).all()
                : [],
        includeReasoning: includeReasoning,
        chatId: chatId,
        mode: mode,
        character: copyInputs(character),
        user: copyInputs(user),
        messages: copyInputs(captured.messages) as ChatMessage[],
        history: captured.history,
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

export const prepareGenerationContext = async (
    inputs: GenerationInputs,
    options: { recordStats?: boolean; loadHistory?: boolean } = {}
) => {
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
    const textMode =
        inputs.mode === 'local'
            ? !inputs.useModelTemplate
            : inputs.apiConfig?.request.completionType.type === 'textCompletions'
    const reader =
        options.loadHistory !== false && inputs.history
            ? createHistoryReader({
                  chatId: inputs.chatId,
                  history: inputs.history,
                  messages: inputs.messages,
                  includeReasoning: inputs.includeReasoning,
                  summaries: inputs.summaries ?? [],
                  estimateOverhead: (hint) =>
                      (hint.id >= 0 && instruct.names ? hint.nameTokens : 0) +
                      (hint.id >= 0 && instruct.timestamp ? 10 : 0) +
                      (textMode
                          ? hint.is_user
                              ? instructCache.input_prefix_length +
                                instructCache.input_suffix_length
                              : instructCache.output_prefix_length +
                                instructCache.output_suffix_length
                          : 0),
              })
            : undefined
    const history = reader
        ? []
        : summarizeHistory(
              inputs.messages,
              inputs.summaries ?? [],
              inputs.history
                  ? generationHistoryCutoff(inputs.chatId, inputs.history, inputs.messages)
                  : undefined
          )
    const summaryTokens: Record<number, { summarizedMessages: number; rawHistory: number }> =
        reader?.summaryTokens ?? {}
    for (const summary of reader ? [] : (inputs.summaries ?? [])) {
        const id = -10_000 - summary.id
        if (!history.some((message) => message.id === id)) continue
        const sources = inputs.messages.filter(
            (message) => message.id >= summary.start_entry_id && message.id <= summary.end_entry_id
        )
        summaryTokens[id] = {
            summarizedMessages: sources.length,
            // Historical cached counts are approximate. Do not retokenize compressed history.
            rawHistory: sources.reduce((total, message) => {
                const swipe = message.swipes.find((item) => item.active)
                return total + (swipe?.token_length ?? Math.ceil((swipe?.swipe.length ?? 0) / 4))
            }, 0),
        }
    }
    return {
        onContextStats:
            options.recordStats === false
                ? undefined
                : (stats: Parameters<typeof recordContextStats>[1]) =>
                      recordContextStats(inputs.chatId, {
                          ...stats,
                          response: inputs.samplers.genamt,
                      }),
        summaryTokens: summaryTokens,
        character: character,
        user: user,
        instruct: instruct,
        macros: macros,
        textFilter: inputs.textFilter,
        bypassContextLength: inputs.bypassContextLength,
        messages: copyInputs(history),
        messageLoader: reader
            ? {
                  loadOlder: async (remainingTokens: number) =>
                      copyInputs(reader.read(remainingTokens)),
              }
            : undefined,
        tokenizer: tokenizer,
        includeInlineReasoning: inputs.mode === 'local',
        chatTokenizer: (message: ChatMessage) =>
            message.id < 0
                ? tokenizer(message.swipes.find((swipe) => swipe.active)?.swipe ?? '')
                : Chats.actions.countMessageTokens(message, tokenizer),
        cache: { characterCounts, userCounts, instructCache },
        dataSources: await inputs.dataSources,
    }
}

export const generationContextLimit = (inputs: GenerationInputs) => {
    if (inputs.mode === 'local') return inputs.localConfig.context_length
    const configured = inputs.samplers.max_length
    const modelValue = inputs.apiConfig?.model.contextSizeParser
        ?.split('.')
        .reduce((value, key) => value?.[key], inputs.apiValues?.model)
    return inputs.apiConfig?.model.useModelContextLength && Number.isInteger(modelValue)
        ? Math.min(configured, modelValue)
        : configured
}

// A trigger estimate must not tokenize the entire old history or load attachment files.
export const estimateGenerationContext = async (inputs: GenerationInputs) => {
    const estimate = (text: string) => Math.ceil(text.length / 4)
    const context = await prepareGenerationContext(
        { ...inputs, tokenizer: async (text) => estimate(text), dataSources: Promise.resolve([]) },
        { recordStats: false, loadHistory: false }
    )
    const sources = await inputs.dataSources
    const capacity = Math.max(0, generationContextLimit(inputs) - inputs.samplers.genamt)
    let total = 0
    const originalMessages = new Map(inputs.messages.map((message) => [message.id, message]))
    await collectContext({
        ...context,
        apiConfig: inputs.apiConfig ?? defaultTemplates[0],
        apiValues: inputs.apiValues ?? {
            ...defaultTemplates[0].defaultValues,
            configName: defaultTemplates[0].name,
        },
        messages: context.messages.map((message) => ({ ...message, attachments: [] })),
        chatTokenizer: async (message) => {
            const swipe = message.swipes.find((item) => item.active)
            return swipe?.token_length ?? estimate(swipe?.swipe ?? '')
        },
        bypassContextLength: true,
        maxLength: capacity,
        mode:
            inputs.mode === 'local'
                ? inputs.useModelTemplate
                    ? 'chat'
                    : 'text'
                : inputs.apiConfig?.request.completionType.type === 'textCompletions'
                  ? 'text'
                  : 'chat',
        onContextStats: (stats) => {
            total = stats.total
        },
    })
    const imageTokens = context.messages.reduce(
        (sum, message) =>
            sum +
            (originalMessages.get(message.id)?.attachments.filter((item) => item.type === 'image')
                .length ?? 0) *
                512,
        0
    )
    // Only aggregate old cached lengths; preflight must not materialize old text or media.
    const older = inputs.history
        ? Chats.db.query.historyStats(inputs.chatId, {
              throughId: inputs.history.throughId,
              beforeId: inputs.messages[0]?.id,
              includeReasoning: inputs.includeReasoning,
              excludeRanges: usableSummariesBefore(
                  generationHistoryCutoff(inputs.chatId, inputs.history, inputs.messages),
                  inputs.summaries ?? []
              ),
          })
        : undefined
    const textMode =
        inputs.mode === 'local'
            ? !inputs.useModelTemplate
            : inputs.apiConfig?.request.completionType.type === 'textCompletions'
    const olderTokens = older
        ? older.tokens +
          older.imageTokens +
          (inputs.instruct.names ? older.nameTokens : 0) +
          (inputs.instruct.timestamp ? older.messageCount * 10 : 0) +
          (textMode
              ? older.userCount *
                    (context.cache.instructCache.input_prefix_length +
                        context.cache.instructCache.input_suffix_length) +
                (older.messageCount - older.userCount) *
                    (context.cache.instructCache.output_prefix_length +
                        context.cache.instructCache.output_suffix_length)
              : 0)
        : 0
    return {
        total:
            total +
            olderTokens +
            imageTokens +
            sources.reduce((sum, source) => sum + Math.max(0, source.tokenBudget), 0),
        capacity,
    }
}
