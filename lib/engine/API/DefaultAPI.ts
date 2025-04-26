import { SamplerID } from '@lib/constants/SamplerData'

import { APIConfiguration } from './APIBuilder.types'

export const defaultTemplates: APIConfiguration[] = [
    // OPENAI
    {
        version: 1,
        name: 'OpenAI',

        defaultValues: {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            modelEndpoint: 'https://api.openai.com/v1/models',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            usePrefill: false,
            useFirstMessage: false,
            useKey: true,
            useModel: true,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'stream', samplerID: SamplerID.STREAMING },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'top_p', samplerID: SamplerID.TOP_P },
                { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
                { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
                { externalName: 'seed', samplerID: SamplerID.SEED },
            ],
            completionType: {
                type: 'chatCompletions',
                userRole: 'user',
                systemRole: 'system',
                assistantRole: 'assistant',
                contentName: 'content',
            },
            authHeader: 'Authorization',
            authPrefix: 'Bearer ',
            responseParsePattern: 'choices.0.delta.content',
            useStop: true,
            stopKey: 'stop',
            promptKey: 'messages',
            removeLength: true,
        },

        payload: {
            type: 'openai',
        },

        model: {
            useModelContextLength: false,
            nameParser: 'id',
            contextSizeParser: '',
            modelListParser: 'data',
        },

        ui: {
            editableCompletionPath: false,
            editableModelPath: false,
            selectableModel: false,
        },
    },
    // KoboldCPP
    {
        version: 1,
        name: 'KoboldCPP',

        defaultValues: {
            endpoint: 'http://127.0.0.1/api/extra/generate/stream',
            modelEndpoint: '127.0.0.1',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            usePrefill: false,
            useFirstMessage: false,
            useKey: true,
            useModel: false,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
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
                { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
                { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
                { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
                { externalName: 'min_p', samplerID: SamplerID.MIN_P },
                { externalName: 'grammar', samplerID: SamplerID.GRAMMAR_STRING },
                { externalName: 'use_default_badwordids', samplerID: SamplerID.BAN_EOS_TOKEN },
                { externalName: 'dynatemp_range', samplerID: SamplerID.DYNATEMP_RANGE },
                { externalName: 'smooth_range', samplerID: SamplerID.SMOOTHING_FACTOR },
                { externalName: 'sampler_seed', samplerID: SamplerID.SEED },
                { externalName: 'dry_multiplier', samplerID: SamplerID.DRY_MULTIPLIER },
                { externalName: 'dry_base', samplerID: SamplerID.DRY_BASE },
                { externalName: 'dry_allowed_length', samplerID: SamplerID.DRY_ALLOWED_LENGTH },
                { externalName: 'dry_sequence_break', samplerID: SamplerID.DRY_SEQUENCE_BREAK },
                { externalName: 'xtc_threshold', samplerID: SamplerID.XTC_THRESHOLD },
                { externalName: 'xtc_probability', samplerID: SamplerID.XTC_PROBABILITY },
            ],
            completionType: {
                type: 'textCompletions',
            },
            authHeader: 'Authorization',
            authPrefix: 'Bearer ',
            responseParsePattern: 'token',
            useStop: true,
            stopKey: 'stop_sequence',
            promptKey: 'prompt',
            removeLength: false,
        },

        payload: {
            type: 'openai',
        },

        model: {
            useModelContextLength: false,
            nameParser: '',
            contextSizeParser: '',
            modelListParser: '',
        },

        ui: {
            editableCompletionPath: true,
            editableModelPath: false,
            selectableModel: true,
        },
    },
    // Mancer
    {
        version: 1,
        name: 'Mancer',

        defaultValues: {
            endpoint: 'https://neuro.mancer.tech/oai/v1/completions',
            modelEndpoint: 'https://neuro.mancer.tech/oai/v1/models',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            usePrefill: false,
            useFirstMessage: false,
            useKey: true,
            useModel: true,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'repetition_penalty', samplerID: SamplerID.REPETITION_PENALTY },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'top_a', samplerID: SamplerID.TOP_A },
                { externalName: 'top_p', samplerID: SamplerID.TOP_P },
                { externalName: 'top_k', samplerID: SamplerID.TOP_K },
                { externalName: 'tfs', samplerID: SamplerID.TAIL_FREE_SAMPLING },
                { externalName: 'typical_p', samplerID: SamplerID.TYPICAL },
                { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
                { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
                { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
                { externalName: 'min_p', samplerID: SamplerID.MIN_P },
                { externalName: 'stream', samplerID: SamplerID.STREAMING },
                { externalName: 'use_default_badwordids', samplerID: SamplerID.BAN_EOS_TOKEN },
            ],
            completionType: { type: 'textCompletions' },
            authHeader: 'X-API-KEY',
            authPrefix: '',
            responseParsePattern: 'choices.0.text',
            useStop: true,
            stopKey: 'stop_sequence',
            promptKey: 'prompt',
            removeLength: false,
        },

        payload: {
            type: 'openai',
        },

        model: {
            useModelContextLength: true,
            nameParser: 'id',
            contextSizeParser: 'limits.context',
            modelListParser: 'data',
        },

        ui: {
            editableCompletionPath: false,
            editableModelPath: false,
            selectableModel: true,
        },
    },
    // Ollama
    {
        version: 1,
        name: 'Ollama',

        defaultValues: {
            endpoint: 'http://127.0.0.1/api/generate',
            modelEndpoint: 'http://127.0.0.1/api/tags',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            useKey: false,
            useModel: true,
            usePrefill: false,
            useFirstMessage: false,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'num_ctx', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'num_predict', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'repeat_penalty', samplerID: SamplerID.REPETITION_PENALTY },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'top_p', samplerID: SamplerID.TOP_P },
                { externalName: 'top_k', samplerID: SamplerID.TOP_K },
                { externalName: 'typical_p', samplerID: SamplerID.TYPICAL },
                { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
                { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
                { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
                { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
                { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
                { externalName: 'seed', samplerID: SamplerID.SEED },
                { externalName: 'keep_alive', samplerID: SamplerID.KEEP_ALIVE_DURATION },
            ],
            completionType: { type: 'textCompletions' },
            authHeader: '',
            authPrefix: '',
            responseParsePattern: 'response',
            useStop: false,
            stopKey: '',
            promptKey: 'prompt',
            removeLength: false,
        },

        payload: {
            type: 'ollama',
        },

        model: {
            useModelContextLength: false,
            nameParser: 'name',
            contextSizeParser: '',
            modelListParser: 'models',
        },

        ui: {
            editableCompletionPath: true,
            editableModelPath: true,
            selectableModel: true,
        },
    },
    // Claude
    {
        version: 1,
        name: 'Claude',

        defaultValues: {
            endpoint: 'https://api.anthropic.com/v1/messages',
            modelEndpoint: 'https://api.anthropic.com/v1/models',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            useKey: true,
            useModel: true,
            usePrefill: true,
            useFirstMessage: false,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'stream', samplerID: SamplerID.STREAMING },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'top_p', samplerID: SamplerID.TOP_P },
                { externalName: 'top_k', samplerID: SamplerID.TOP_K },
            ],
            completionType: {
                type: 'chatCompletions',
                userRole: 'user',
                systemRole: 'system',
                assistantRole: 'assistant',
                contentName: 'content',
            },
            authHeader: 'x-api-key',
            authPrefix: '',
            responseParsePattern: 'delta.text',
            useStop: true,
            stopKey: 'stop_sequences',
            promptKey: 'messages',
            removeLength: true,
        },

        payload: {
            type: 'claude',
        },

        model: {
            useModelContextLength: false,
            nameParser: 'id',
            contextSizeParser: '',
            modelListParser: 'data',
        },

        ui: {
            editableCompletionPath: true,
            editableModelPath: false,
            selectableModel: true,
        },
    },
    // Cohere
    {
        version: 1,
        name: 'Cohere',

        defaultValues: {
            endpoint: 'https://api.cohere.com/v2/chat',
            modelEndpoint: 'https://api.cohere.com/v1/models',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            useKey: true,
            useModel: true,
            usePrefill: false,
            useFirstMessage: false,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'stream', samplerID: SamplerID.STREAMING },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'p', samplerID: SamplerID.TOP_P },
                { externalName: 'k', samplerID: SamplerID.TOP_K },
                { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
                { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
                { externalName: 'seed', samplerID: SamplerID.SEED },
            ],
            completionType: {
                type: 'chatCompletions',
                userRole: 'user',
                systemRole: 'system',
                assistantRole: 'assistant',
                contentName: 'content',
            },
            authHeader: 'Authorization',
            authPrefix: 'Bearer ',
            responseParsePattern: 'delta.message.content.text',
            useStop: true,
            stopKey: 'stop_sequences',
            promptKey: 'messages',
            removeLength: true,
            removeSeedifNegative: true,
        },

        payload: {
            type: 'openai',
        },

        model: {
            useModelContextLength: true,
            nameParser: 'name',
            contextSizeParser: 'context_length',
            modelListParser: 'models',
        },

        ui: {
            editableCompletionPath: false,
            editableModelPath: false,
            selectableModel: true,
        },
    },
    // Open Router
    {
        version: 1,
        name: 'Open Router',

        defaultValues: {
            endpoint: 'https://openrouter.ai/api/v1/chat/completions',
            modelEndpoint: 'https://openrouter.ai/api/v1/models',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            useKey: true,
            useModel: true,
            usePrefill: false,
            useFirstMessage: false,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'include_reasoning', samplerID: SamplerID.INCLUDE_REASONING },
                { externalName: 'stream', samplerID: SamplerID.STREAMING },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
                { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
                { externalName: 'top_p', samplerID: SamplerID.TOP_P },
                { externalName: 'top_k', samplerID: SamplerID.TOP_K },
                { externalName: 'seed', samplerID: SamplerID.SEED },
            ],
            completionType: {
                type: 'chatCompletions',
                userRole: 'user',
                systemRole: 'system',
                assistantRole: 'assistant',
                contentName: 'content',
            },
            authHeader: 'Authorization',
            authPrefix: 'Bearer ',
            responseParsePattern: 'choices.0.delta.content',
            useStop: true,
            stopKey: 'stop',
            promptKey: 'messages',
            removeLength: true,
            removeSeedifNegative: true,
        },

        payload: {
            type: 'openai',
        },

        model: {
            useModelContextLength: true,
            nameParser: 'id',
            contextSizeParser: 'context_length',
            modelListParser: 'data',
        },

        ui: {
            editableCompletionPath: false,
            editableModelPath: false,
            selectableModel: true,
        },
    },
    // Horde
    {
        version: 1,
        name: 'Horde',

        defaultValues: {
            endpoint: 'https://aihorde.net/api/v2/',
            modelEndpoint: 'https://aihorde.net/api/v2/status/models?type=text&model_state=all',
            prefill: '',
            firstMessage: '',
            key: '0000000000',
            model: [],
        },

        features: {
            useKey: true,
            useModel: true,
            usePrefill: false,
            useFirstMessage: false,
            multipleModels: true,
        },

        request: {
            requestType: 'horde',
            samplerFields: [
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
            ],
            completionType: { type: 'textCompletions' },
            authHeader: 'apikey',
            authPrefix: '',
            responseParsePattern: '',
            useStop: true,
            stopKey: 'stop_sequence',
            promptKey: 'prompt',
            removeLength: true,
        },

        payload: {
            type: 'horde',
        },

        model: {
            useModelContextLength: false,
            nameParser: 'name',
            contextSizeParser: '',
            modelListParser: '',
        },

        ui: {
            editableCompletionPath: false,
            editableModelPath: false,
            selectableModel: true,
        },
    },

    // Google AI Studio
    {
        version: 1,
        name: 'Google AI Studio',

        defaultValues: {
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            modelEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            usePrefill: false,
            useFirstMessage: false,
            useKey: true,
            useModel: true,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'stream', samplerID: SamplerID.STREAMING },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'top_p', samplerID: SamplerID.TOP_P },
                { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
            ],
            completionType: {
                type: 'chatCompletions',
                userRole: 'user',
                systemRole: 'system',
                assistantRole: 'assistant',
                contentName: 'content',
            },
            authHeader: 'Authorization',
            authPrefix: 'Bearer ',
            responseParsePattern: 'choices.0.delta.content',
            useStop: true,
            stopKey: 'stop',
            promptKey: 'messages',
            removeLength: true,
        },

        payload: {
            type: 'openai',
        },

        model: {
            useModelContextLength: false,
            nameParser: 'id',
            contextSizeParser: '',
            modelListParser: 'data',
        },

        ui: {
            editableCompletionPath: true,
            editableModelPath: true,
            selectableModel: true,
        },
    },
    // Chat Completions
    {
        version: 1,
        name: 'Chat Completions',

        defaultValues: {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            modelEndpoint: 'https://api.openai.com/v1/models',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            usePrefill: false,
            useFirstMessage: false,
            useKey: true,
            useModel: true,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'stream', samplerID: SamplerID.STREAMING },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'top_p', samplerID: SamplerID.TOP_P },
                { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
                { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
                { externalName: 'seed', samplerID: SamplerID.SEED },
            ],
            completionType: {
                type: 'chatCompletions',
                userRole: 'user',
                systemRole: 'system',
                assistantRole: 'assistant',
                contentName: 'content',
            },
            authHeader: 'Authorization',
            authPrefix: 'Bearer ',
            responseParsePattern: 'choices.0.delta.content',
            useStop: true,
            stopKey: 'stop',
            promptKey: 'messages',
            removeLength: true,
        },

        payload: {
            type: 'openai',
        },

        model: {
            useModelContextLength: false,
            nameParser: 'id',
            contextSizeParser: '',
            modelListParser: 'data',
        },

        ui: {
            editableCompletionPath: true,
            editableModelPath: true,
            selectableModel: true,
        },
    },
    // Text Completions
    {
        version: 1,
        name: 'Text Completions',

        defaultValues: {
            endpoint: 'https://openai.com/chatgpt/api/chat',
            modelEndpoint: 'https://openai.com/chatgpt/api/models',
            prefill: '',
            firstMessage: '',
            key: '',
            model: undefined,
        },

        features: {
            usePrefill: false,
            useFirstMessage: false,
            useKey: true,
            useModel: false,
            multipleModels: false,
        },

        request: {
            requestType: 'stream',
            samplerFields: [
                { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
                { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
                { externalName: 'stream', samplerID: SamplerID.STREAMING },
                { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
                { externalName: 'min_p', samplerID: SamplerID.MIN_P },
                { externalName: 'top_a', samplerID: SamplerID.TOP_A },
                { externalName: 'top_p', samplerID: SamplerID.TOP_P },
                { externalName: 'top_k', samplerID: SamplerID.TOP_K },
                { externalName: 'smoothing_factor', samplerID: SamplerID.SMOOTHING_FACTOR },

                { externalName: 'tfs', samplerID: SamplerID.TAIL_FREE_SAMPLING },
                { externalName: 'seed', samplerID: SamplerID.SEED },
                { externalName: 'typical', samplerID: SamplerID.TYPICAL },
                { externalName: 'repetition_penalty', samplerID: SamplerID.REPETITION_PENALTY },
                {
                    externalName: 'repetition_penalty_range',
                    samplerID: SamplerID.REPETITION_PENALTY_RANGE,
                },
                { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
                { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
                { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
                { externalName: 'grammar', samplerID: SamplerID.GRAMMAR_STRING },
                { externalName: 'ignore_eos', samplerID: SamplerID.BAN_EOS_TOKEN },
                { externalName: 'dynatemp_range', samplerID: SamplerID.DYNATEMP_RANGE },

                { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
                { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
                { externalName: 'skip_special_tokens', samplerID: SamplerID.SKIP_SPECIAL_TOKENS },
            ],
            completionType: {
                type: 'textCompletions',
            },
            authHeader: 'Authorization',
            authPrefix: 'Bearer ',
            responseParsePattern: 'choices.0.text',
            useStop: true,
            stopKey: 'stop',
            promptKey: 'prompt',
            removeLength: true,
        },

        payload: {
            type: 'openai',
        },

        model: {
            useModelContextLength: false,
            nameParser: 'id',
            contextSizeParser: '',
            modelListParser: 'data',
        },

        ui: {
            editableCompletionPath: true,
            editableModelPath: false,
            selectableModel: false,
        },
    },
]

