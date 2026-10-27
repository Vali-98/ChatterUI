import { nativeApplicationVersion } from 'expo-application'
import { t } from 'i18next'

import { AppSettings, CLAUDE_VERSION } from '@lib/constants/GlobalValues'
import { SSEFetch } from '@lib/engine/SSEFetch'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'
import { getNestedValue } from '@lib/utils/Parsing'

import { createStopFilter } from '../stopSequenceFilter'
import { APIConfiguration } from './APIBuilder.types'
import { buildContext, ContextBuilderParams } from './ContextBuilder'
import { buildRequest, RequestBuilderParams } from './RequestBuilder'

export type CompletionReason = 'completed' | 'cancelled' | 'failed'
export type RequestHandle = { abort: () => void; done: Promise<void> }

export type DataOutputType = 'text' | 'reasoning' | 'tool_call'

type DataOutput = {
    type: DataOutputType
    content: string
}

export interface APIBuilderParams
    extends ContextBuilderParams,
        Omit<RequestBuilderParams, 'prompt'> {
    onFinishReason?: (reason: string) => void
    onData: (data: DataOutput) => void
    onEnd?: (data: string) => void | Promise<void>
    signal: AbortSignal
    stopSequence: string[]
    stopGenerating?: (reason: CompletionReason) => void | Promise<void>
}

export const buildAndSendRequest = (params: APIBuilderParams): RequestHandle => {
    const { apiConfig, apiValues, stopSequence, onData, onEnd } = params
    let request: RequestHandle | undefined
    let aborted = false
    let finalized = false
    const isAborted = () => aborted || params.signal.aborted
    const filters = {
        text: createStopFilter(stopSequence),
        reasoning: createStopFilter(stopSequence),
    }
    const emit = (type: 'text' | 'reasoning', content: string) => {
        if (content) onData({ type: type, content: content })
    }
    const finish = async (reason: CompletionReason) => {
        if (finalized) return
        finalized = true
        emit('reasoning', filters.reasoning.flush())
        emit('text', filters.text.flush())
        await params.stopGenerating?.(reason)
    }
    const abort = () => {
        aborted = true
        request?.abort()
    }
    const done = (async () => {
        try {
            if (isAborted()) {
                await finish('cancelled')
                return
            }
            const bypassContextLength =
                params.bypassContextLength ?? mmkv.getBoolean(AppSettings.BypassContextLength)
            const prompt = await buildContext({ ...params, bypassContextLength })
            if (isAborted()) {
                await finish('cancelled')
                return
            }
            if (prompt === undefined) {
                Logger.errorToast(t('generation.errors.promptConstructionFailed'))
                await finish('failed')
                return
            }
            const payload = await buildRequest({ ...params, prompt })
            if (isAborted()) {
                await finish('cancelled')
                return
            }
            if (!payload) {
                Logger.errorToast(t('generation.errors.payloadConstructionFailed'))
                await finish('failed')
                return
            }
            const header: Record<string, string> = {}
            if (apiConfig.features.useKey) {
                if (apiConfig.name === 'Claude') header['anthropic-version'] = CLAUDE_VERSION
                header[apiConfig.request.authHeader] = apiConfig.request.authPrefix + apiValues.key
            }
            const parseOutput = (
                event: unknown,
                pattern: string | string[],
                type: 'text' | 'reasoning'
            ) => {
                const content = getNestedValue(event, pattern)
                if (typeof content === 'string') emit(type, filters[type].push(content))
            }
            request = responses[apiConfig.request.requestType]({
                endpoint: apiValues.endpoint,
                payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
                signal: params.signal,
                onEvent: (event) => {
                    const parsed = typeof event === 'string' ? JSON.parse(event) : event
                    const finishReason =
                        parsed?.choices?.[0]?.finish_reason ??
                        parsed?.delta?.stop_reason ??
                        parsed?.stop_reason
                    if (typeof finishReason === 'string') params.onFinishReason?.(finishReason)
                    const reasoning = apiConfig.request.reasoningParsePattern
                    if (reasoning && apiConfig.request.completionType.type === 'chatCompletions')
                        parseOutput(parsed, reasoning, 'reasoning')
                    parseOutput(parsed, apiConfig.request.responseParsePattern, 'text')
                },
                onEnd: onEnd,
                header: header,
                stopGenerating: finish,
            })
            await request.done
        } catch (error) {
            Logger.errorToast(t('generation.errors.completionFailed'), error)
            if (finalized) throw error
            await finish(isAborted() ? 'cancelled' : 'failed')
        }
    })()
    return { abort: abort, done: done }
}

type KeyHeader = {
    [key: string]: string
}

type SenderParams = {
    signal: AbortSignal
    endpoint: string
    payload: string
    header: KeyHeader
    onEnd?: (data: string) => void | Promise<void>
    onEvent: (event: any) => void
    stopGenerating: (reason: CompletionReason) => void | Promise<void>
}

const hordeResponse = (params: SenderParams): RequestHandle => {
    const endpoint = 'https://aihorde.net/api/v2/'
    const controller = new AbortController()
    let generationId = ''
    let cancelled = false
    let deleted = false
    const headers = {
        ...params.header,
        'Client-Agent': `ChatterUI:${nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`,
        accept: 'application/json',
        'content-type': 'application/json',
    }
    const deleteJob = () => {
        if (!generationId || deleted) return
        deleted = true
        void fetch(`${endpoint}generate/text/status/${generationId}`, {
            method: 'DELETE',
            headers: headers,
        }).catch(Logger.error)
    }
    const abort = () => {
        cancelled = true
        controller.abort()
        deleteJob()
    }
    const wait = () =>
        new Promise<void>((resolve) => {
            const finish = () => {
                clearTimeout(timer)
                controller.signal.removeEventListener('abort', finish)
                resolve()
            }
            const timer = setTimeout(finish, 5000)
            controller.signal.addEventListener('abort', finish, { once: true })
            if (cancelled) finish()
        })
    params.signal.addEventListener('abort', abort)
    const done = (async () => {
        let reason: CompletionReason = 'completed'
        try {
            if (params.signal.aborted) abort()
            if (cancelled) return
            const response = await fetch(`${endpoint}generate/text/async`, {
                method: 'POST',
                body: params.payload,
                headers: headers,
                signal: controller.signal,
            })
            if (response.status !== 202)
                throw new Error(
                    `Horde request failed (${response.status}): ${await response.text()}`
                )
            generationId = (await response.json()).id
            if (!generationId) throw new Error('Horde did not return a generation ID')
            if (cancelled) {
                deleteJob()
                return
            }
            while (!cancelled) {
                await wait()
                if (cancelled) return
                const status = await fetch(`${endpoint}generate/text/status/${generationId}`, {
                    headers: headers,
                    signal: controller.signal,
                })
                if (!status.ok)
                    throw new Error(
                        `Horde polling failed (${status.status}): ${await status.text()}`
                    )
                const result = await status.json()
                if (cancelled) return
                if (result.faulted) throw new Error('Horde generation failed')
                if (result.done) {
                    params.onEvent(result)
                    return
                }
            }
        } catch (error) {
            if (!cancelled) {
                reason = 'failed'
                Logger.errorToast(t('generation.errors.generationFailed'), error)
            }
        } finally {
            params.signal.removeEventListener('abort', abort)
            if (cancelled) reason = 'cancelled'
            await params.stopGenerating(reason)
            if (reason === 'completed') await params.onEnd?.('')
        }
    })()
    return { abort: abort, done: done }
}

const readableStreamResponse = (params: SenderParams): RequestHandle => {
    const sse = new SSEFetch()
    let failed = false
    let cancelled = false
    const abort = () => {
        cancelled = true
        sse.abort()
    }
    sse.setOnEvent((data) => {
        if (!data.trim()) return
        const event = JSON.parse(data)
        if (event?.error)
            throw new Error(
                typeof event.error === 'string' ? event.error : JSON.stringify(event.error)
            )
        params.onEvent(event)
    })
    sse.setOnError(() => {
        failed = true
        Logger.errorToast(t('generation.errors.generationFailed'))
    })
    const done = sse
        .start({
            endpoint: params.endpoint,
            body: params.payload,
            method: 'POST',
            signal: params.signal,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                ...params.header,
            },
        })
        .then(async () => {
            const reason: CompletionReason = failed
                ? 'failed'
                : cancelled || params.signal.aborted
                  ? 'cancelled'
                  : 'completed'
            await params.stopGenerating(reason)
            if (reason === 'completed') await params.onEnd?.('')
        })
    return { abort: abort, done: done }
}

const responses: Record<
    APIConfiguration['request']['requestType'],
    (params: SenderParams) => RequestHandle
> = {
    horde: hordeResponse,
    stream: readableStreamResponse,
}
