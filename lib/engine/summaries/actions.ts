import type { SummaryError } from '@db/schema'
import { createDatabaseQueryObserver } from '@lib/queries/databaseQuery'
import { useAppModeStore } from '@lib/state/AppMode'
import { Chats } from '@lib/state/chat'
import { Logger } from '@lib/state/Logger'
import {
    acceptSummary,
    createSummaryDraft,
    deleteSummary as deleteSummaryRow,
    getSummary,
    resetSummaryDraft,
    restrictSummarySources,
    summaryList,
    summaryIdentity,
    updateSummary,
    summaryInputList,
    dependentSummaryIds,
    createConsolidationDraft,
    resetConsolidationDraft,
    restrictConsolidationSources,
} from '@lib/summaries/db'
import {
    selectSummarySources,
    summaryCutoff,
    summaryMessage,
    summaryTranscript,
    usableSummariesBefore,
} from '@lib/summaries/history'
import { useSummarySettingsStore, type SummarySettings } from '@lib/summaries/settingsStore'

import { selectCompressionPlan, type CompressionItem } from '@lib/summaries/compression'
import { createHistoryReader, generationHistoryCutoff } from '../generation/history'
import { buildAndSendRequest, type CompletionReason } from '../API/APIBuilder'
import { buildContext } from '../API/ContextBuilder'
import { isDeferredTaskActive, useDeferredTaskState } from '../generation/deferredState'
import {
    captureGenerationInputs,
    estimateGenerationContext,
    generationContextLimit,
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
        dependentSummaryIds(id).some((id) => !!summaryTask(id)) ||
        summaryList(summary.chat_id)
            .all()
            .some((item) => item.replaces_id === id && !!summaryTask(item.id))
    )
        throw new Error('Summary is busy generating')
    return summary
}
export const saveSummary = (id: number, content: string) => {
    assertSummaryEditable(id)
    acceptSummary(id, { content: content })
}
export const dismissSummaryNotice = (id: number) => {
    updateSummary(id, { notice_dismissed: true })
}
export const restoreSummaryNotice = (id: number) => {
    updateSummary(id, { notice_dismissed: false })
}
export const deleteSummary = (id: number) => {
    const summary = assertSummaryEditable(id)
    deleteSummaryRow(id)
    if (
        useSummarySettingsStore.getState().autoGenerate &&
        useSummarySettingsStore.getState().enabled
    ) {
        try {
            const inputs = captureGenerationInputs(
                summary.chat_id,
                useAppModeStore.getState().appMode
            )
            return prepareAutomaticSummary(inputs).catch(Logger.stackTrace)
        } catch (error) {
            Logger.stackTrace(error)
        }
    }
}

export const generateSummary = (
    chatId: number,
    options: {
        summaryId?: number
        draftContent?: string
        supersedeDraft?: boolean
        continueDraft?: boolean
        inputs?: GenerationInputs
        parentGenerationId?: number
        sourceRange?: { startEntryId: number; endEntryId: number }
        automaticMinimumTokens?: number
        consolidationIds?: number[]
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
            history: 'full',
        })
    const summaries = summaryList(chatId).all()
    const unresolved = summaries.find((summary) => summary.status === 'draft')
    if (unresolved && unresolved.id !== existing?.id)
        throw new Error('Resolve the unfinished summary first')
    if (
        options.continueDraft &&
        (!existing || existing.status !== 'draft' || existing.source_changed)
    )
        throw new Error('This draft must be regenerated')
    // Read current persisted history. Captured connection/model/user configuration remains immutable.
    const wantsConsolidation =
        options.consolidationIds !== undefined || existing?.kind === 'consolidation'
    const messages =
        options.inputs && !wantsConsolidation
            ? (Chats.db.query.chat(chatId)?.messages ?? [])
            : inputs.messages
    const cutoff = inputs.history
        ? generationHistoryCutoff(chatId, inputs.history, inputs.messages)
        : summaryCutoff(messages)
    if (options.continueDraft && existing!.end_entry_id > (cutoff ?? -1))
        throw new Error('Draft now covers protected recent history; regenerate it instead')
    if (
        options.supersedeDraft &&
        (!existing || existing.status !== 'draft' || options.continueDraft)
    )
        throw new Error('Only unfinished summaries can be replaced with newer history')
    const sourceSummaries = options.consolidationIds
        ? options.consolidationIds.map((id) => getSummary(id)!).filter(Boolean)
        : existing?.kind === 'consolidation'
          ? summaryInputList(existing.id).all()
          : undefined
    const consolidating = sourceSummaries !== undefined
    if (consolidating && options.supersedeDraft)
        throw new Error('Consolidation keeps its original sources')
    const sources = sourceSummaries
        ? sourceSummaries.map((source) => summaryMessage(-source.id, source.content))
        : selectSummarySources(
              messages,
              summaries,
              existing?.id,
              options.supersedeDraft,
              options.sourceRange
          )
    if (!sources.length) throw new Error('Not enough eligible history to summarize')
    let draft =
        existing?.status === 'draft'
            ? existing
            : sourceSummaries
              ? createConsolidationDraft(
                    chatId,
                    sourceSummaries.map((source) => source.id),
                    existing?.id
                )
              : createSummaryDraft(chatId, sources, existing?.id)
    if (existing?.status === 'draft' && !options.continueDraft) {
        draft = sourceSummaries
            ? resetConsolidationDraft(
                  existing.id,
                  sourceSummaries.map((source) => source.id)
              )
            : resetSummaryDraft(existing.id, sources)
    }
    const prefix = options.continueDraft ? (options.draftContent ?? draft.content) : ''
    updateSummary(draft.id, {
        content: prefix,
        notice_dismissed: false,
        error: null,
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
                await runSummary(
                    draft.id,
                    sources,
                    inputs,
                    settings,
                    prefix,
                    signal,
                    consolidating,
                    options.automaticMinimumTokens
                )
            } finally {
                unsubscribe()
            }
        },
        {
            kind: 'summary',
            mode: inputs.mode,
            resourceId: draft.id,
            parentGenerationId: options.parentGenerationId,
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
    signal: AbortSignal,
    consolidating = false,
    minimumSourceTokens?: number
) => {
    if (!getSummary(id)) return
    const transcript = (messages: typeof sources) =>
        consolidating
            ? messages.map((message) => `Earlier summary:\n${message.swipes[0].swipe}`).join('\n\n')
            : summaryTranscript(messages)
    let content = prefix
    const parser = createReasoningParser()
    const parseInline =
        inputs.mode === 'local' ||
        inputs.apiConfig?.request.completionType.type === 'textCompletions' ||
        !inputs.apiConfig?.request.reasoningParsePattern?.length
    const append = (text: string) => {
        content += text
    }
    const receive = (text: string) => append(parseInline ? parser.push(text).text : text)
    let successful = false
    let reachedLimit = false
    let failureReason: SummaryError['reason'] = 'failed'
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
        const maxContext = generationContextLimit(inputs)
        const promptTokens = await inputs.tokenizer(settings.prompt + prefix)
        const available = maxContext - settings.maxOutputTokens - promptTokens
        const selected: typeof sources = []
        let tokens = 0
        const sourceTokenCounts: number[] = []
        for (const source of sources) {
            if (signal.aborted) throw new Error('Cancelled')
            const count = await inputs.tokenizer(transcript([source]) + '\n\n')
            if (tokens + count > available) break
            tokens += count
            selected.push(source)
            sourceTokenCounts.push(count)
        }
        const enforceAutomaticRange = () => {
            if (minimumSourceTokens === undefined || consolidating) return
            while (selected.at(-1)?.is_user) {
                selected.pop()
                tokens -= sourceTokenCounts.pop()!
            }
            if (!selected.length || tokens < minimumSourceTokens)
                throw new Error('Eligible history no longer meets the automatic summary minimum')
        }
        enforceAutomaticRange()
        if (!selected.length)
            throw new Error('Eligible history does not fit the summarizer context')
        // Continuation must cover exactly the original range, never silently shrink its coverage.
        if (prefix && selected.length !== sources.length)
            throw new Error('Draft no longer fits; regenerate it instead')
        const requestInputs: GenerationInputs = {
            ...inputs,
            history: undefined,
            apiValues: inputs.apiValues
                ? { ...inputs.apiValues, prefill: '', firstMessage: '' }
                : undefined,
            summaries: [],
            messages: [
                summaryMessage(-1, transcript(selected)),
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
            },
            dataSources: Promise.resolve([]),
            saveLocalKV: false,
            // This request is fitted below as a complete prompt. The generic chat collector
            // must not independently omit the transcript after its coverage has been saved.
            bypassContextLength: true,
        }
        let payload: Awaited<ReturnType<typeof buildLocalPayload>> = undefined
        let context: Awaited<ReturnType<typeof prepareGenerationContext>> | undefined
        while (true) {
            if (signal.aborted) throw new Error('Cancelled')
            let promptLength: number
            if (inputs.mode === 'local') {
                payload = await buildLocalPayload(requestInputs, {
                    continuing: !!prefix,
                    recordStats: false,
                })
                if (!payload) throw new Error('Could not build summary prompt')
                promptLength = await inputs.tokenizer(payload.prompt)
            } else {
                if (!inputs.apiConfig || !inputs.apiValues)
                    throw new Error('No connection selected')
                context = await prepareGenerationContext(requestInputs, { recordStats: false })
                let collectedLength = 0
                const prompt = await buildContext({
                    ...context,
                    apiConfig: inputs.apiConfig,
                    apiValues: requestInputs.apiValues!,
                    maxLength: maxContext - settings.maxOutputTokens,
                    onContextStats: (stats) => {
                        collectedLength = stats.total
                    },
                })
                if (!prompt) throw new Error('Could not build summary prompt')
                promptLength =
                    typeof prompt === 'string' ? await inputs.tokenizer(prompt) : collectedLength
            }
            if (promptLength + settings.maxOutputTokens <= maxContext) break
            if (prefix) throw new Error('Draft no longer fits; regenerate it instead')
            selected.pop()
            tokens -= sourceTokenCounts.pop()!
            enforceAutomaticRange()
            if (!selected.length)
                throw new Error('Eligible history does not fit the summarizer context')
            requestInputs.messages[0] = summaryMessage(-1, transcript(selected))
        }
        if (signal.aborted) throw new Error('Cancelled')
        if (consolidating) {
            if (selected.length < 2)
                throw new Error('At least two summaries must fit the consolidation context')
            restrictConsolidationSources(
                id,
                selected.map((source) => -source.id)
            )
        } else restrictSummarySources(id, selected)
        if (inputs.mode === 'local') {
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
            if (!context || !inputs.apiConfig || !inputs.apiValues)
                throw new Error('Could not build summary prompt')
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
        else if (reachedLimit) {
            failureReason = 'output_limit'
            throw new Error('Output limit reached; continue or edit the draft')
        } else if (!successful) throw new Error('Summary generation failed')
        else if (!completionText.trim()) throw new Error('Summary returned no text')
        else if (!content.trim()) throw new Error('Summary was empty')
    } catch (error) {
        append(parseInline ? parser.finish().text : '')
        updateSummary(id, {
            content: content,
            error: {
                reason: signal.aborted ? 'cancelled' : failureReason,
                message: signal.aborted
                    ? 'Cancelled'
                    : String(error instanceof Error ? error.message : error),
            },
        })
        throw error
    }
}

// Return a task for the caller to await; ignored drafts never grow or retry implicitly.
export const prepareAutomaticSummary = async (
    inputs: GenerationInputs,
    options: { parentGenerationId?: number; signal?: AbortSignal } = {}
) => {
    const settings = useSummarySettingsStore.getState()
    if (!settings.enabled || !settings.autoGenerate || options.signal?.aborted) return
    const summaries = summaryList(inputs.chatId).all()
    const draft = summaries.find((summary) => summary.status === 'draft')
    if (
        draft &&
        (!settings.autoContinueDrafts ||
            draft.source_changed ||
            draft.notice_dismissed ||
            !draft.content.trim() ||
            draft.error?.reason !== 'output_limit' ||
            summaryTask(draft.id))
    )
        return
    if (!draft) {
        const cutoff = inputs.history
            ? generationHistoryCutoff(inputs.chatId, inputs.history, inputs.messages)
            : undefined
        const eligible = inputs.history
            ? cutoff !== undefined &&
              Chats.db.query.hasSummarySources(
                  inputs.chatId,
                  cutoff,
                  usableSummariesBefore(cutoff, summaries)
              )
            : selectSummarySources(inputs.messages, summaries).length > 0
        if (!eligible && !settings.consolidateSummaries) return
    }
    const stats = await estimateGenerationContext({ ...inputs, summaries })
    if (
        options.signal?.aborted ||
        stats.capacity <= 0 ||
        stats.total / stats.capacity < settings.autoThreshold / 100
    )
        return
    if (draft)
        return generateSummary(inputs.chatId, {
            inputs,
            summaryId: draft.id,
            continueDraft: true,
            parentGenerationId: options.parentGenerationId,
        })
    const cutoff = inputs.history
        ? generationHistoryCutoff(inputs.chatId, inputs.history, inputs.messages)
        : summaryCutoff(inputs.messages)
    const used = usableSummariesBefore(cutoff, summaries)
    const items: CompressionItem[] = []
    const budget = stats.historyBudget
    if (inputs.history) {
        const reader = createHistoryReader({
            chatId: inputs.chatId,
            history: inputs.history,
            messages: inputs.messages,
            includeReasoning: false,
            summaries,
        })
        let remaining = budget
        let stop = false
        while (remaining > 0 && !stop) {
            const batch = reader.readHints(remaining)
            if (!batch.length) break
            const accepted: CompressionItem[] = []
            for (const item of [...batch].reverse()) {
                if (item.tokens > remaining) {
                    stop = true
                    break
                }
                accepted.unshift(item)
                remaining -= item.tokens
            }
            items.unshift(...accepted)
        }
    } else {
        // Full-history inputs are used by manual/test callers; use the same source policy.
        const logical = inputs.messages
            .filter(
                (message) =>
                    !used.some(
                        (summary) =>
                            message.id >= summary.start_entry_id &&
                            message.id <= summary.end_entry_id
                    )
            )
            .map((message) => ({
                id: message.id,
                position: message.id,
                kind: 'message' as const,
                isUser: message.is_user,
                tokens:
                    message.swipes.find((swipe) => swipe.active)?.token_length ??
                    Math.ceil(
                        (message.swipes.find((swipe) => swipe.active)?.swipe.length ?? 0) / 4
                    ),
            }))
        const combined: CompressionItem[] = [
            ...logical,
            ...used.map((summary) => ({
                id: summary.id,
                position: summary.end_entry_id,
                kind: 'summary' as const,
                isUser: true,
                tokens: Math.ceil(summary.content.length / 4),
            })),
        ].sort((a, b) => b.position - a.position)
        let remaining = budget
        for (const item of combined) {
            if (item.tokens > remaining) break
            items.unshift(item)
            remaining -= item.tokens
        }
    }
    const plan = selectCompressionPlan(items, summaries, {
        capacity: stats.capacity,
        used: stats.capacity - budget + items.reduce((sum, item) => sum + item.tokens, 0),
        cutoff,
        minimumPercent: settings.autoMinHistory,
        maximumCoveragePercent: settings.autoMaxCoverage,
        consolidate: settings.consolidateSummaries,
    })
    if (!plan || options.signal?.aborted) return
    return generateSummary(inputs.chatId, {
        inputs,
        ...(plan.kind === 'history'
            ? {
                  sourceRange: plan,
                  automaticMinimumTokens: (stats.capacity * settings.autoMinHistory) / 100,
              }
            : { consolidationIds: plan.summaryIds }),
        parentGenerationId: options.parentGenerationId,
    })
}
