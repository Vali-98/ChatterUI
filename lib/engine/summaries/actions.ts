import { createDatabaseQueryObserver } from '@lib/queries/databaseQuery'
import { useAppModeStore } from '@lib/state/AppMode'
import { Chats } from '@lib/state/chat'
import { Logger } from '@lib/state/Logger'
import {
    acceptSummary,
    createSummaryDraft,
    getSummary,
    resetSummaryDraft,
    restrictSummarySources,
    summaryList,
    summaryIdentity,
    updateSummary,
} from '@lib/summaries/db'
import {
    selectSummarySources,
    summaryCutoff,
    summaryMessage,
    summaryTranscript,
} from '@lib/summaries/history'
import { useSummarySettingsStore, type SummarySettings } from '@lib/summaries/settingsStore'

import { buildAndSendRequest, type CompletionReason } from '../API/APIBuilder'
import { useContextStatsState } from '../generation/contextStatsState'
import { isDeferredTaskActive, useDeferredTaskState } from '../generation/deferredState'
import {
    captureGenerationInputs,
    prepareGenerationContext,
    type GenerationInputs,
} from '../generation/inputs'
import {
    cancelDeferredTask,
    scheduleDeferredTask,
    type DeferredTaskHandle,
} from '../generation/scheduler'
import { Llama } from '../Local/LlamaLocal'
import { buildLocalPayload } from '../Local/payload'
import { createReasoningParser } from '../reasoning/parser'
import { createStopFilter } from '../stopSequenceFilter'

export const summaryTask = (id: number) =>
    Object.values(useDeferredTaskState.getState().tasks).find(
        (task) => task.kind === 'summary' && task.resourceId === id && isDeferredTaskActive(task)
    )
export const assertSummaryEditable = (id: number) => {
    const summary = getSummary(id)
    if (
        !summary ||
        summaryTask(id) ||
        summaryList(summary.chat_id)
            .all()
            .some((item) => item.replaces_id === id && !!summaryTask(item.id))
    )
        throw new Error('Summary is busy generating')
    return summary
}
export const keepSummary = (id: number, content?: string) => {
    assertSummaryEditable(id)
    acceptSummary(id, { content: content })
}
export const setSummaryEnabled = (id: number, enabled: boolean) => {
    const summary = assertSummaryEditable(id)
    if (summary.status !== 'accepted') return
    // Keep the replacement range unambiguous when re-enabling an older summary.
    if (enabled)
        for (const other of summaryList(summary.chat_id).all()) {
            if (
                other.id !== id &&
                other.enabled &&
                other.status === 'accepted' &&
                other.start_entry_id <= summary.end_entry_id &&
                other.end_entry_id >= summary.start_entry_id
            )
                updateSummary(other.id, { enabled: false })
        }
    updateSummary(id, { enabled })
}
export const dismissSummaryNotice = (id: number) => {
    updateSummary(id, { notice_dismissed: true })
}
export const discardSummary = (id: number) => {
    const summary = assertSummaryEditable(id)
    if (summary.status !== 'draft') throw new Error('Only drafts can be discarded')
    updateSummary(id, {
        status: 'discarded',
        enabled: false,
        notice_dismissed: true,
        content: '',
        error: null,
    })
}

export const generateSummary = (
    chatId: number,
    options: {
        summaryId?: number
        draftContent?: string
        continueDraft?: boolean
        inputs?: GenerationInputs
        automatic?: boolean
    } = {}
) => {
    const settings = { ...useSummarySettingsStore.getState() }
    if (!settings.enabled) throw new Error('Enable summaries in Data Sources first')
    const existing =
        options.summaryId === undefined ? undefined : assertSummaryEditable(options.summaryId)
    if (existing && existing.chat_id !== chatId) throw new Error('Summary belongs to another chat')
    const inputs =
        options.inputs ??
        captureGenerationInputs(chatId, useAppModeStore.getState().appMode, {
            includeDataSources: false,
            includeSummaries: false,
        })
    const summaries = summaryList(chatId).all()
    const unresolved = summaries.find((summary) => summary.status === 'draft')
    if (unresolved && unresolved.id !== existing?.id)
        throw new Error('Resolve the unfinished summary first')
    if (
        options.continueDraft &&
        (!existing ||
            existing.status !== 'draft' ||
            existing.source_changed ||
            !(options.draftContent ?? existing.content).trim())
    )
        throw new Error('This draft must be regenerated')
    // Read current persisted history. Captured connection/model/user configuration remains immutable.
    const messages = options.inputs
        ? (Chats.db.query.chat(chatId)?.messages ?? [])
        : inputs.messages
    if (options.continueDraft && existing!.end_entry_id > (summaryCutoff(messages) ?? -1))
        throw new Error('Draft now covers protected recent history; regenerate it instead')
    const sources = selectSummarySources(messages, summaries, existing?.id)
    if (!sources.length) throw new Error('Not enough eligible history to summarize')
    if (
        options.automatic &&
        !options.continueDraft &&
        summaries.some(
            (summary) =>
                summary.status === 'discarded' &&
                !summary.source_changed &&
                summary.start_entry_id === sources[0].id &&
                summary.eligible_end_id >= sources.at(-1)!.id
        )
    )
        return
    let draft =
        existing?.status === 'draft' ? existing : createSummaryDraft(chatId, sources, existing?.id)
    if (existing?.status === 'draft' && !options.continueDraft) {
        draft = resetSummaryDraft(existing.id, sources)
    }
    const prefix = options.continueDraft ? (options.draftContent ?? draft.content) : ''
    updateSummary(draft.id, {
        content: prefix,
        notice_dismissed: false,
        error: null,
        attempt_count: draft.attempt_count + 1,
    })
    const task: DeferredTaskHandle = scheduleDeferredTask(
        chatId,
        async (signal) => {
            const query = summaryIdentity(draft.id)
            const observer = createDatabaseQueryObserver(query, {
                watch: [{ table: 'chat_summaries', rowId: draft.id }],
                initialData: query.all(),
            })
            const checkOwner = () => {
                if (!observer.getSnapshot().data.length) cancelDeferredTask(task.id)
            }
            const unsubscribe = observer.subscribe(checkOwner)
            try {
                checkOwner()
                await runSummary(draft.id, sources, inputs, settings, prefix, signal)
            } finally {
                unsubscribe()
            }
        },
        {
            kind: 'summary',
            mode: inputs.mode,
            resourceId: draft.id,
            timeoutMs: 300_000,
        }
    )
    return { ...task, summaryId: draft.id }
}

const runSummary = async (
    id: number,
    sources: ReturnType<typeof selectSummarySources>,
    inputs: GenerationInputs,
    settings: SummarySettings,
    prefix: string,
    signal: AbortSignal
) => {
    if (!getSummary(id)) return
    let content = prefix
    let lastSave = 0
    const parser = createReasoningParser()
    const parseInline =
        inputs.mode === 'local' ||
        inputs.apiConfig?.request.completionType.type === 'textCompletions' ||
        !inputs.apiConfig?.request.reasoningParsePattern?.length
    const append = (text: string) => {
        content += text
        if (Date.now() - lastSave >= 1000) {
            updateSummary(id, { content })
            lastSave = Date.now()
        }
    }
    const receive = (text: string) => append(parseInline ? parser.push(text).text : text)
    let successful = false
    let reachedLimit = false
    try {
        if (signal.aborted) throw new Error('Cancelled')
        if (inputs.mode === 'local') {
            const state = Llama.useLlamaModelStore.getState()
            if (!state.context || !state.model)
                throw new Error('Load a local model before summarizing')
            if (inputs.localModel && state.model.id !== inputs.localModel.id)
                throw new Error('Local model changed before summarization')
            inputs.activateLocalTokenizer()
        }
        const maxContext = summaryContextLimit(inputs)
        const promptTokens = await inputs.tokenizer(settings.prompt + prefix)
        const available = maxContext - settings.maxOutputTokens - promptTokens - 512
        const selected: typeof sources = []
        let tokens = 0
        for (const source of sources) {
            if (signal.aborted) throw new Error('Cancelled')
            const count = await inputs.tokenizer(summaryTranscript([source]) + '\n\n')
            if (tokens + count > available) break
            tokens += count
            selected.push(source)
        }
        if (!selected.length)
            throw new Error('Eligible history does not fit the summarizer context')
        // Continuation must cover exactly the original range, never silently shrink its coverage.
        if (prefix && selected.length !== sources.length)
            throw new Error('Draft no longer fits; regenerate it instead')
        restrictSummarySources(id, selected)
        const requestInputs: GenerationInputs = {
            ...inputs,
            apiValues: inputs.apiValues
                ? { ...inputs.apiValues, prefill: '', firstMessage: '' }
                : undefined,
            summaries: [],
            messages: [
                summaryMessage(-1, summaryTranscript(selected)),
                ...(prefix ? [summaryMessage(-2, prefix, false)] : []),
            ],
            instruct: {
                ...inputs.instruct,
                system_prompt_format: '{{system_prefix}}{{system_prompt}}',
                system_prompt: settings.prompt,
                examples: false,
                hide_think_tags: true,
                names: false,
                timestamp: false,
            },
            samplers: {
                ...inputs.samplers,
                genamt: settings.maxOutputTokens,
                enable_thinking: false,
                reasoning_max_tokens: 0,
                reasoning_exclude: true,
                reasoning_effort: 'low',
            },
            dataSources: Promise.resolve([]),
            saveLocalKV: false,
            bypassContextLength: false,
        }
        if (inputs.mode === 'local') {
            const payload = await buildLocalPayload(requestInputs, {
                continuing: !!prefix,
                recordStats: false,
            })
            if (!payload) throw new Error('Could not build summary prompt')
            const thinking = payload as typeof payload & {
                thinking_forced_open?: boolean
                thinking_end_tag?: string
            }
            if (thinking.thinking_forced_open && thinking.thinking_end_tag)
                parser.startReasoning(thinking.thinking_end_tag)
            const filter = createStopFilter(inputs.stopSequence)
            const localContext = Llama.useLlamaModelStore.getState().context!
            const stop = () => {
                void localContext.stopCompletion().catch(Logger.stackTrace)
            }
            signal.addEventListener('abort', stop)
            try {
                if (signal.aborted) throw new Error('Cancelled')
                await Llama.useLlamaModelStore.getState().completion(
                    payload,
                    (text) => receive(filter.push(text)),
                    (_text, timings) => {
                        reachedLimit = timings.predicted_n >= settings.maxOutputTokens
                    },
                    { saveKV: false }
                )
                receive(filter.flush())
                successful = true
            } finally {
                signal.removeEventListener('abort', stop)
            }
        } else {
            if (!inputs.apiConfig || !inputs.apiValues) throw new Error('No connection selected')
            const context = await prepareGenerationContext(requestInputs, { recordStats: false })
            const completion: { reason: CompletionReason } = { reason: 'failed' }
            const result = buildAndSendRequest({
                ...context,
                apiConfig: inputs.apiConfig,
                apiValues: requestInputs.apiValues!,
                samplers: requestInputs.samplers,
                maxLength: maxContext - settings.maxOutputTokens,
                stopSequence: inputs.stopSequence,
                signal: signal,
                onData: (data) => {
                    if (data.type === 'text') receive(data.content)
                },
                onFinishReason: (reason) => {
                    if (['length', 'max_tokens', 'model_length'].includes(reason))
                        reachedLimit = true
                },
                stopGenerating: (result) => {
                    completion.reason = result
                },
            })
            await result.done
            successful = completion.reason === 'completed'
        }
        append(parseInline ? parser.finish().text : '')
        updateSummary(id, { content })
        const completionText = content.slice(prefix.length)
        reachedLimit ||= (await inputs.tokenizer(completionText)) >= settings.maxOutputTokens
        const summary = getSummary(id)
        if (
            !signal.aborted &&
            successful &&
            !reachedLimit &&
            completionText.trim() &&
            content.trim() &&
            summary &&
            !summary.source_changed
        ) {
            if ((await inputs.tokenizer(content)) >= tokens)
                throw new Error('Summary did not reduce the source size; edit it or regenerate')
            if (signal.aborted) throw new Error('Cancelled')
            acceptSummary(id, { requireUnchanged: true })
        } else if (signal.aborted) throw new Error('Cancelled')
        else if (reachedLimit) throw new Error('Output limit reached; continue or edit the draft')
        else if (!successful) throw new Error('Summary generation failed')
        else if (!completionText.trim()) throw new Error('Summary returned no text')
        else if (!content.trim()) throw new Error('Summary was empty')
    } catch (error) {
        append(parseInline ? parser.finish().text : '')
        updateSummary(id, {
            content: content,
            error: signal.aborted
                ? 'Cancelled'
                : String(error instanceof Error ? error.message : error),
        })
        throw error
    }
}

export const summaryContextLimit = (inputs: GenerationInputs) => {
    if (inputs.mode === 'local') return inputs.localConfig.context_length
    const configured = inputs.samplers.max_length
    const path = inputs.apiConfig?.model.contextSizeParser
    const modelValue = path
        ?.split('.')
        .reduce((value, key) => value?.[key], inputs.apiValues?.model)
    return inputs.apiConfig?.model.useModelContextLength && Number.isInteger(modelValue)
        ? Math.min(configured, modelValue)
        : configured
}

export const maybeGenerateSummary = (inputs: GenerationInputs) => {
    const settings = useSummarySettingsStore.getState()
    if (!settings.enabled || !settings.autoGenerate) return
    const stats = useContextStatsState.getState().chats[inputs.chatId]
    if (
        !stats ||
        stats.capacity <= 0 ||
        stats.total / stats.capacity < settings.autoThreshold / 100
    )
        return
    const draft = summaryList(inputs.chatId)
        .all()
        .find((summary) => summary.status === 'draft')
    if (draft) {
        if (
            settings.autoContinueDrafts &&
            !draft.source_changed &&
            !draft.notice_dismissed &&
            draft.content.trim() &&
            draft.error?.startsWith('Output limit reached') &&
            draft.attempt_count < 2 &&
            !summaryTask(draft.id)
        ) {
            try {
                generateSummary(inputs.chatId, {
                    inputs: inputs,
                    summaryId: draft.id,
                    continueDraft: true,
                    automatic: true,
                })
            } catch (error) {
                Logger.stackTrace(error)
            }
        }
        return
    }
    try {
        generateSummary(inputs.chatId, { inputs: inputs, automatic: true })
    } catch (error) {
        Logger.stackTrace(error)
    }
}
