import { Global } from '@constants/GlobalValues'
import { Logger } from 'app/constants/Logger'
import { SamplerID } from 'app/constants/Samplers'

import { APIBase, APISampler } from './BaseAPI'

class ClaudeAPI extends APIBase {
    //TODO: Mancer does have new fields
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'stream', samplerID: SamplerID.STREAMING },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length = payloadFields?.['max_context_length']
        delete payloadFields?.max_context_length
        const claudeModel = this.getObject(Global.ClaudeModel)
        const messages = this.buildChatCompletionContext(typeof length === 'number' ? length : 0)
        const firstMes = this.getString(Global.ClaudeFirstMessage)
        const prefill = this.getString(Global.ClaudePrefill)
        const system = messages[0]
        messages.shift()
        if (messages.at(-1)?.content)
            messages[messages.length - 1].content = prefill + messages.at(-1)?.content

        return {
            system: system.content,
            ...payloadFields,
            model: claudeModel.id,
            messages: [{ role: 'user', content: firstMes }, ...messages],
            stop_sequences: this.constructStopSequence(),
        }
    }
    inference = async () => {
        const claudeKey = this.getString(Global.ClaudeAPIKey)
        const claudeEndpoint =
            this.getString(Global.ClaudeEndpoint) ?? `https://api.anthropic.com/v1/messages`
        Logger.log(`Using endpoint: Claude`)
        this.readableStreamResponse(
            claudeEndpoint !== `` ? claudeEndpoint : `https://api.anthropic.com/v1/messages`,
            JSON.stringify(this.buildPayload()),
            (item) => {
                try {
                    if (typeof item === 'string') {
                        const parsed = JSON.parse(item)
                        return parsed?.delta?.text
                    }
                    if (typeof item === 'object') {
                        return JSON.parse(item?.data)?.delta?.text
                    }
                } catch (e) {
                    return ''
                }
                return ''
            },
            () => {},
            { 'X-API-KEY': claudeKey, 'anthropic-version': '2023-06-01' }
        )
    }
}

const claudeAPI = new ClaudeAPI()
export default claudeAPI
