import { SamplerID } from '@lib/constants/SamplerData'

export type APISampler = {
    samplerID: SamplerID
    externalName: string
}

// These are for ChatterUI's interface
// When a user wishes to add new 'X' API, we can control which fields remain default, and which can be edited
export interface UISettings {
    editableCompletionPath: boolean
    editableModelPath: boolean
    selectableModel: boolean
}

// These are the actual values being stored by ChatterUI
export interface APIValues {
    endpoint: string
    modelEndpoint: string
    prefill: string
    firstMessage: string
    key: string
    model: any
    // config name is unique and defines which template to use on generation
    configName: string
}

// Enable and disable features as needed
export interface APIFeatures {
    usePrefill: boolean
    useFirstMessage: boolean
    useKey: boolean
    useModel: boolean
    multipleModels: boolean
}

export interface APIRequestFormat {
    // horde requires a special response format
    requestType: 'stream' | 'horde'
    // refer to SamplerData.ts
    samplerFields: APISampler[]
    // whether or not a stop sequence is used
    useStop: boolean
    // what key to use for stop sequencees, eg { ["stop_sequence_key"]: [...] }
    stopKey: string
    // key for the prompt, eg 'messages' , 'prompt', 'chat_history'
    promptKey: string
    completionType:
        | {
              type: 'chatCompletions'
              userRole: string
              systemRole: string
              assistantRole: string
              contentName: string
          }
        | { type: 'textCompletions' }
    // key for the authorization header
    authHeader: 'Authorization' | 'X-API-KEY' | string
    // added before the api key value
    authPrefix: 'Bearer ' | string
    // how we get data out of the response stream, eg data.content.delta.text
    responseParsePattern: string
    // whether or not to remove the max_length field
    removeLength: boolean
    // some APIs like Cohere do not allow negative seed values
    removeSeedifNegative?: boolean
}
// most APIs use the 'openai' format.
// This is a misnomer as it general means "throw everything in the base level body"
// cohere is defined, however its format now supports openai
// custom formats allows you to define a string with macros instead
export type APIPayloadFormat =
    | { type: 'openai' | 'ollama' | 'cohere' | 'horde' | 'claude' }
    | { type: 'custom'; customPayload: string }

export interface APIModelFormat {
    // whether or not to use a model's context length or
    // the length provided by the max_length sampler
    useModelContextLength: boolean
    // how to parse the name from the model response body, eg data.name
    nameParser: string
    // how to parse the name from the model response body, eg data.context_length
    contextSizeParser: string
    // how to parse the list of models from the model response body, eg data.models
    modelListParser: string
}

export interface APIConfiguration {
    //currently v1
    version: number
    name: string
    // default values do not need a configName
    defaultValues: Omit<APIValues, 'configName'>
    features: APIFeatures
    request: APIRequestFormat
    payload: APIPayloadFormat
    model: APIModelFormat
    ui: UISettings
}
