import { CLAUDE_VERSION } from '@lib/constants/GlobalValues'
import { SSEFetch } from '@lib/engine/SSEFetch'
import { Characters } from '@lib/state/Characters'
import { Chats, useInference } from '@lib/state/Chat'
import { Instructs, InstructType } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { useTTSState } from '@lib/state/TTS'
import { nativeApplicationVersion } from 'expo-application'

import { APIState } from './APIManagerState'
import { buildRequest } from './RequestBuilder'

export const buildAndSendRequest = async () => {
    const requestValues = APIState.useAPIState
        .getState()
        .values.find((item, index) => index === APIState.useAPIState.getState().activeIndex)

    if (!requestValues) {
        Logger.warnToast(`No Active API`)
        Chats.useChatState.getState().stopGenerating()
        return
    }

    const configs = APIState.useAPIState
        .getState()
        .getTemplates()
        .filter((item) => item.name === requestValues.configName)

    const config = configs[0]
    if (!config) {
        Logger.errorToast(`Configuration "${requestValues?.configName}" not found`)
        Chats.useChatState.getState().stopGenerating()
        return
    }

    Logger.info(`Using Configuration: ${requestValues.configName}`)

    let payload: any = undefined
    payload = buildRequest(config, requestValues)

    if (!payload) {
        Logger.errorToast('Something Went Wrong With Payload Construction')
        Chats.useChatState.getState().stopGenerating()
        return
    }

    if (typeof payload !== 'string') {
        payload = JSON.stringify(payload)
    }

    let header: any = {}
    if (config.features.useKey) {
        const anthropicVersion =
            config.name === 'Claude' ? { 'anthropic-version': CLAUDE_VERSION } : {}

        header = {
            ...anthropicVersion,
            [config.request.authHeader]: config.request.authPrefix + requestValues.key,
        }
    }

    if (config.request.requestType === 'stream')
        readableStreamResponse(
            requestValues.endpoint,
            payload,
            (responseString) => {
                try {
                    return getNestedValue(
                        JSON.parse(responseString),
                        config.request.responseParsePattern
                    )
                } catch (e) {}
            },
            header
        )
    else {
        hordeResponse(
            requestValues.endpoint,
            payload,
            (responseString) => {
                try {
                    return getNestedValue(
                        JSON.parse(responseString),
                        config.request.responseParsePattern
                    )
                } catch (e) {}
            },
            header
        )
    }
}

type KeyHeader = {
    [key: string]: string
}

const readableStreamResponse = async (
    endpoint: string,
    payload: string,
    jsonreader: (event: any) => string,
    header: KeyHeader = {}
) => {
    const replace = RegExp(
        constructReplaceStrings()
            .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join(`|`),
        'g'
    )

    const sse = new SSEFetch()

    const closeStream = () => {
        Logger.debug('Running Close Stream')
        Chats.useChatState.getState().stopGenerating()
    }

    useInference.getState().setAbort(async () => {
        Logger.debug('Running Abort')
        sse.abort()
    })

    sse.setOnEvent((data) => {
        const text = (jsonreader(data) ?? '').replaceAll(replace, '')
        Chats.useChatState.getState().insertBuffer(text)
        useTTSState.getState().insertBuffer(text)
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
        endpoint: endpoint,
        body: payload,
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            ...header,
        },
    })
}

const hordeResponse = async (
    endpoint: string,
    payload: string,
    jsonreader: (event: any) => string,
    header: KeyHeader = {}
) => {
    const hordeURL = `https://aihorde.net/api/v2/`
    let generation_id = ''
    let aborted = false

    useInference.getState().setAbort(() => {
        aborted = true
        if (generation_id !== null)
            fetch(`${hordeURL}generate/text/status/${generation_id}`, {
                method: 'DELETE',
                headers: {
                    'Client-Agent': `ChatterUI:${nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`,
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            }).catch((error) => {
                Logger.error(error)
            })
        Chats.useChatState.getState().stopGenerating()
    })

    Logger.info(`Using Horde`)

    const request = await fetch(`${hordeURL}generate/text/async`, {
        method: 'POST',
        body: payload,
        headers: {
            ...header,
            'Client-Agent': `ChatterUI:${nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`,
            accept: 'application/json',
            'content-type': 'application/json',
        },
    })

    if (request.status === 401) {
        Logger.error(`Invalid API Key`)
        Chats.useChatState.getState().stopGenerating()
        return
    }
    if (request.status !== 202) {
        Logger.error(`Horde Request failed.`)
        Chats.useChatState.getState().stopGenerating()
        const body = await request.json()
        Logger.error(JSON.stringify(body))
        for (const e of body.errors) Logger.error(e)
        return
    }

    const body = await request.json()
    generation_id = body.id
    let result = undefined

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
            Chats.useChatState.getState().stopGenerating()
            Logger.error((await response.json())?.message)
            return
        }

        result = await response.json()
    } while (!result.done)

    if (aborted) return

    const replace = RegExp(
        constructReplaceStrings()
            .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join(`|`),
        'g'
    )
    const text = result.generations[0].text.replaceAll(replace, '')
    Chats.useChatState.getState().setBuffer(text)
    useTTSState.getState().insertBuffer(text)
    Chats.useChatState.getState().stopGenerating()
}

const constructReplaceStrings = (): string[] => {
    const currentInstruct: InstructType = Instructs.useInstruct.getState().replacedMacros()
    // default stop strings defined instructs
    const stops: string[] = constructStopSequence()
    // additional stop strings based on context configuration
    const output: string[] = []

    if (currentInstruct.names) {
        const userName = Characters.useCharacterCard.getState().card?.name ?? ''
        const charName: string = Characters.useCharacterCard.getState()?.card?.name ?? ''
        output.push(`${userName} :`)
        output.push(`${charName} :`)
    }
    return [...stops, ...output]
}

const constructStopSequence = (): string[] => {
    const instruct = Instructs.useInstruct.getState().replacedMacros()
    const sequence: string[] = []
    if (instruct.stop_sequence !== '')
        instruct.stop_sequence.split(',').forEach((item) => item !== '' && sequence.push(item))
    return sequence
}

const getNestedValue = (obj: any, path: string) => {
    const keys = path.split('.')
    const value = keys.reduce((acc, key) => acc?.[key], obj)
    return value ?? null
}
