import { API } from '@lib/constants/API'
import { useInference } from '@lib/storage/Chat'
import { Logger } from '@lib/storage/Logger'

import { APIBase } from './BaseAPI'
import chatCompletionsAPI from './ChatCompletionsAPI'
import claudeAPI from './ClaudeAPI'
import cohereAPI from './CohereAPI'
import hordeAPI from './HordeAPI'
import koboldAPI from './KoboldAPI'
import localAPI from './LocalAPI'
import mancerAPI from './MancerAPI'
import ollamaAPI from './OllamaAPI'
import openaiAPI from './OpenAIAPI'
import openRouterAPI from './OpenRouterAPI'
import tgwuiAPI from './TGWUIAPI'
import textCompletionAPI from './TextCompletionAPI'

class UnimplementedAPI extends APIBase {
    inference = async () => {
        Logger.log('Unimplemented API', true)
        setTimeout(() => this.stopGenerating(), 1000)
        useInference.getState().setAbort(() => {
            this.stopGenerating()
        })
    }
}

const unimplementedAPI = new UnimplementedAPI()

export const APIState: Record<API, APIBase> = {
    [API.KAI]: koboldAPI,
    [API.HORDE]: hordeAPI,
    [API.MANCER]: mancerAPI,
    [API.TGWUI]: tgwuiAPI,
    [API.COMPLETIONS]: textCompletionAPI,
    [API.LOCAL]: localAPI,
    [API.OPENAI]: openaiAPI,
    [API.OPENROUTER]: openRouterAPI,
    [API.OLLAMA]: ollamaAPI,
    [API.CLAUDE]: claudeAPI,
    [API.CHATCOMPLETIONS]: chatCompletionsAPI,
    [API.COHERE]: cohereAPI,
    //UNIMPLEMENTED
    [API.NOVELAI]: unimplementedAPI,
    [API.APHRODITE]: unimplementedAPI,
}
