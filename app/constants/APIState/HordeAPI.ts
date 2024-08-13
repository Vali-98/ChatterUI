import { Global } from '@constants/GlobalValues'
import { Chats, useInference } from 'app/constants/Chat'
import { Logger } from 'app/constants/Logger'
import { SamplerID } from 'app/constants/SamplerData'
import { nativeApplicationVersion } from 'expo-application'

import { APIBase, APISampler } from './BaseAPI'

export const hordeHeader = () => {
    return {
        'Client-Agent': `ChatterUI:${nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`,
    }
}

class HordeAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_length', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'rep_pen', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'rep_pen_range', samplerID: SamplerID.REPETITION_PENALTY_RANGE },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'tfs', samplerID: SamplerID.TAIL_FREE_SAMPLING },
        { externalName: 'top_a', samplerID: SamplerID.TOP_A },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'typical', samplerID: SamplerID.TYPICAL },
        { externalName: 'singleline', samplerID: SamplerID.SINGLE_LINE },
        { externalName: 'min_p', samplerID: SamplerID.MIN_P },
        { externalName: 'use_default_badwordids', samplerID: SamplerID.BAN_EOS_TOKEN },
    ]
    buildPayload = () => {
        const hordeModels = this.getObject(Global.HordeModels)
        const hordeWorkers = this.getObject(Global.HordeWorkers)

        const usedModels = hordeModels.map((item: any) => {
            return item.name
        })
        const usedWorkers = hordeWorkers.filter((item: any) =>
            item.models.some((model: any) => usedModels.includes(model))
        )
        const maxWorkerContext = Math.min.apply(
            null,
            usedWorkers.map((item: any) => {
                return item.max_context_length
            })
        )
        const usedResponseLength = Math.min.apply(
            null,
            usedWorkers.map((item: any) => {
                return item?.max_length
            })
        )

        Logger.log('Max worker context length: ' + maxWorkerContext)
        Logger.log('Max worker response length: ' + usedResponseLength)
        Logger.log('Models used: ' + usedModels)

        const payloadFields = this.getSamplerFields(maxWorkerContext)
        const length = payloadFields?.['max_context_length']
        const limit = payloadFields?.['max_length']
        const top_p = payloadFields?.['top_p']
        if (!top_p) delete payloadFields?.['top_p']

        return {
            params: {
                ...payloadFields,
                n: 1,
                max_length:
                    typeof limit === 'number'
                        ? Math.min(usedResponseLength, limit)
                        : usedResponseLength,
                frmtadsnsp: false,
                frmtrmblln: false,
                frmtrmspch: false,
                frmttriminc: true,
                stop_sequence: this.constructStopSequence(),
            },
            prompt: this.buildTextCompletionContext(typeof length === 'number' ? length : 0),
            trusted_workers: false,
            slow_workers: true,
            workers: [],
            worker_blacklist: false,
            models: usedModels,
            dry_run: false,
        }
    }
    inference = async () => {
        const hordeURL = `https://aihorde.net/api/v2/`
        const hordeKey = this.getString(Global.HordeKey)
        const hordeModels = this.getObject(Global.HordeModels)
        Logger.log(`Using endpoint: Horde`)
        let generation_id = ''
        let aborted = false

        if (hordeModels.length === 0) {
            Logger.log(`No Models Selected`, true)
            this.stopGenerating()
            return
        }

        useInference.getState().setAbort(() => {
            aborted = true
            if (generation_id !== null)
                fetch(`${hordeURL}generate/text/status/${generation_id}`, {
                    method: 'DELETE',
                    headers: {
                        ...hordeHeader(),
                        accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                }).catch((error) => {
                    Logger.log(error)
                })
            this.stopGenerating()
        })

        Logger.log(`Using Horde`)

        const payload = this.buildPayload()
        const request = await fetch(`${hordeURL}generate/text/async`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                apikey: hordeKey,
                ...hordeHeader(),
                accept: 'application/json',
                'content-type': 'application/json',
            },
        })

        if (request.status === 401) {
            Logger.log(`Invalid API Key`, true)
            this.stopGenerating()
            return
        }
        if (request.status !== 202) {
            Logger.log(`Request failed.`)
            this.stopGenerating()
            const body = await request.json()
            Logger.log(JSON.stringify(body))
            for (const e of body.errors) Logger.log(e)
            return
        }

        const body = await request.json()
        generation_id = body.id
        let result = undefined

        do {
            await new Promise((resolve) => setTimeout(resolve, 5000))
            if (aborted) return

            Logger.log(`Checking...`)
            const response = await fetch(`${hordeURL}generate/text/status/${generation_id}`, {
                method: 'GET',
                headers: {
                    ...hordeHeader(),
                    accept: 'application/json',
                    'content-type': 'application/json',
                },
            })

            if (response.status === 400) {
                Logger.log(`Response failed.`)
                this.stopGenerating()
                Logger.log((await response.json())?.message)
                return
            }

            result = await response.json()
        } while (!result.done)

        if (aborted) return

        const replace = RegExp(
            this.constructReplaceStrings()
                .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join(`|`),
            'g'
        )

        Chats.useChat.getState().setBuffer(result.generations[0].text.replaceAll(replace, ''))
        this.stopGenerating()
    }
}

const hordeAPI = new HordeAPI()
export default hordeAPI
