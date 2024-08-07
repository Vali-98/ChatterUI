import { API } from '@constants/API'
import { Logger } from '@constants/Logger'

import { APIBase } from './BaseAPI'
import hordeAPI from './HordeAPI'
import koboldAPI from './KoboldAPI'
import localAPI from './LocalAPI'
import mancerAPI from './MancerAPI'
import openaiAPI from './OpenAIAPI'
import openRouterAPI from './OpenRouterAPI'
import tgwuiAPI from './TGWUIAPI'
import textCompletionAPI from './TextCompletionAPI'

class UnimplementedAPI extends APIBase {
    inference = async () => {
        Logger.log('Unimplemented API', true)
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

    //UNIMPLEMENTED
    [API.NOVELAI]: unimplementedAPI,
    [API.APHRODITE]: unimplementedAPI,
}
