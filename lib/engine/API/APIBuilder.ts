import { AppSettings, CLAUDE_VERSION } from '@lib/constants/GlobalValues'
import { SSEFetch } from '@lib/engine/SSEFetch'
import { Logger } from '@lib/state/Logger'
import { nativeApplicationVersion } from 'expo-application'

import { mmkv } from '@lib/storage/MMKV'
import { buildContext, ContextBuilderParams } from './ContextBuilder'
import { buildRequest, RequestBuilderParams } from './RequestBuilder'

export interface APIBuilderParams
    extends ContextBuilderParams,
        Omit<RequestBuilderParams, 'prompt'> {
    onData: (data: string) => void
    onEnd: (data: string) => void
    stopSequence: string[]
    stopGenerating: () => void
}

export const buildAndSendRequest = async ({
    apiConfig,
    apiValues,
    onData,
    onEnd,
    instruct,
    samplers,
    character,
    user,
    messages,
    stopSequence,
    stopGenerating,
    chatTokenizer,
    tokenizer,
    messageLoader,
    maxLength,
    cache,
}: APIBuilderParams) => {
    try {
        let payload: any = undefined
        const bypassContextLength = mmkv.getBoolean(AppSettings.BypassContextLength)
        const prompt = await buildContext({
            apiConfig,
            apiValues,
            instruct,
            character,
            user,
            messages,
            chatTokenizer,
            tokenizer,
            messageLoader,
            maxLength,
            cache,
            bypassContextLength,
        })
        if (prompt === undefined) {
            Logger.errorToast(`Prompt construction failed`)
            stopGenerating()
            return
        }

        payload = await buildRequest({
            apiConfig,
            apiValues,
            samplers,
            instruct,
            prompt,
            stopSequence,
        })

        if (!payload) {
            Logger.errorToast(`Payload construction failed`)
            stopGenerating()
            return
        }

        if (typeof payload !== 'string') {
            payload = JSON.stringify(payload)
        }

        let header: any = {}
        if (apiConfig.features.useKey) {
            const anthropicVersion =
                apiConfig.name === 'Claude' ? { 'anthropic-version': CLAUDE_VERSION } : {}

            header = {
                ...anthropicVersion,
                [apiConfig.request.authHeader]: apiConfig.request.authPrefix + apiValues.key,
            }
        }

        const sendFunc =
            apiConfig.request.requestType === 'stream' ? readableStreamResponse : hordeResponse

        const replaceStrings = constructReplaceStrings(stopSequence)

        return sendFunc({
            endpoint: apiValues.endpoint,
            payload: payload,
            onEvent: (event) => {
                try {
                    const data = getNestedValue(
                        typeof event === 'string' ? JSON.parse(event) : event,
                        apiConfig.request.responseParsePattern
                    )
                    const text = data.replaceAll(replaceStrings, '')

                    onData(text)
                } catch (e) {}
            },
            onEnd: onEnd,
            header: header,
            stopGenerating: stopGenerating,
        })
    } catch (e) {
        Logger.errorToast('Completion failed: ' + e)
        stopGenerating()
    }
}

type KeyHeader = {
    [key: string]: string
}

type SenderParams = {
    endpoint: string
    payload: string
    header: KeyHeader
    onEnd: (data: string) => void
    onEvent: (event: any) => void
    stopGenerating: () => void
}

const hordeResponse = (senderParams: SenderParams) => {
    const hordeURL = `https://aihorde.net/api/v2/`
    let generation_id = ''
    let aborted = false

    const abortFn = () => {
        aborted = true
        if (generation_id) {
            fetch(`${hordeURL}generate/text/status/${generation_id}`, {
                method: 'DELETE',
                headers: {
                    'Client-Agent': `ChatterUI:${nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`,
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }).catch(Logger.error)
        }
        senderParams.stopGenerating()
    }

    const sendRequest = async () => {
        Logger.info(`Using Horde`)

        const request = await fetch(`${hordeURL}generate/text/async`, {
            method: 'POST',
            body: senderParams.payload,
            headers: {
                ...senderParams.header,
                'Client-Agent': `ChatterUI:${nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`,
                accept: 'application/json',
                'content-type': 'application/json',
            },
        })

        if (request.status === 401) {
            Logger.error(`Invalid API Key`)
            senderParams.stopGenerating()
            return
        }

        if (request.status !== 202) {
            Logger.error(`Horde Request failed.`)
            senderParams.stopGenerating()
            const body = await request.json()
            Logger.error(JSON.stringify(body))
            for (const e of body.errors) Logger.error(e)
            return
        }

        const body = await request.json()
        generation_id = body.id
        let result

        do {
            await new Promise((resolve) => setTimeout(resolve, 5000))
            if (aborted) return

            Logger.info(`Checking...`)
            const response = await fetch(`${hordeURL}generate/text/status/${generation_id}`, {
                method: 'GET',
                headers: {
                    'Client-Agent': `ChatterUI:${nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`,
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
            })

            if (response.status === 400) {
                Logger.error(`Response failed.`)
                senderParams.stopGenerating()
                Logger.error((await response.json())?.message)
                return
            }

            result = await response.json()
        } while (!result.done)

        if (aborted) return
        if (result) senderParams.onEvent(result)
        senderParams.stopGenerating()
    }
    sendRequest()

    return abortFn
}

const readableStreamResponse = async (senderParams: SenderParams) => {
    const sse = new SSEFetch()

    const closeStream = () => {
        Logger.debug('Running Close Stream')
        senderParams.onEnd('')
        senderParams.stopGenerating()
    }

    sse.setOnEvent((data) => {
        try {
            const a = JSON.parse(data)
            if (a?.error) {
                Logger.errorToast('Error Logged')
                Logger.error(data)
            }
        } catch (e) {}
        senderParams.onEvent(data)
    })

    sse.setOnError(() => {
        Logger.errorToast('Generation Failed')
        closeStream()
    })

    sse.setOnClose(() => {
        Logger.info('Stream Closed')
        closeStream()
    })

    sse.start({
        endpoint: senderParams.endpoint,
        body: senderParams.payload,
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            ...senderParams.header,
        },
    })

    return () => sse.abort()
}

const constructReplaceStrings = (stopSequence: string[]) => {
    const replace = RegExp(
        stopSequence.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(`|`),
        'g'
    )
}

const getNestedValue = (obj: any, path: string) => {
    const keys = path.split('.')
    const value = keys.reduce((acc, key) => acc?.[key], obj)
    return value ?? null
}
