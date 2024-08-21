export enum SamplerID {
    TEMPERATURE = 'temp',
    MIN_P = 'min_p',
    TOP_K = 'top_k',
    TOP_A = 'top_a',
    TOP_P = 'top_p',

    SINGLE_LINE = 'single_line',
    //SAMPLER_ORDER = 'sampler_order',
    SEED = 'seed',

    TAIL_FREE_SAMPLING = 'tfs',
    EPSILON_CUTOFF = 'epsilon_cutoff',
    ETA_CUTOFF = 'eta_cutoff',
    TYPICAL = 'typical',
    REPETITION_PENALTY = 'rep_pen',
    REPETITION_PENALTY_RANGE = 'rep_pen_range',
    REPETITION_PENALTY_SLOPE = 'rep_pen_slope',
    NO_REPEAT_NGRAM_SIZE = 'no_repeat_ngram_size',
    PENALTY_ALPHA = 'penalty_alpha',
    NUM_BEAMS = 'num_beams',
    LENGTH_PENALTY = 'length_penalty',
    MIN_LENGTH = 'min_length',
    ENCODER_REPETITION_PENALTY = 'encoder_rep_pen',
    FREQUENCY_PENALTY = 'freq_pen',
    PRESENCE_PENALTY = 'presence_pen',
    DO_SAMPLE = 'do_sample',
    EARLY_STOPPING = 'early_stopping',
    ADD_BOS_TOKEN = 'add_bos_token',
    BAN_EOS_TOKEN = 'ban_eos_token',
    //TRUNCATION_LENGTH = 'truncation_length',
    SKIP_SPECIAL_TOKENS = 'skip_special_tokens',
    STREAMING = 'streaming',
    MIROSTAT_MODE = 'mirostat_mode',
    MIROSTAT_TAU = 'mirostat_tau',
    MIROSTAT_ETA = 'mirostat_eta',
    GUIDANCE_SCALE = 'guidance_scale',
    NEGATIVE_PROMPT = 'negative_prompt',
    GRAMMAR_STRING = 'grammar_string',
    BANNED_TOKENS = 'banned_tokens',
    //REPETITION_PENALTY_SIZE = 'rep_pen_size',

    CONTEXT_LENGTH = 'max_length',
    GENERATED_LENGTH = 'genamt',

    DYNATEMP_RANGE = 'dynatemp_range',
    SMOOTHING_FACTOR = 'smoothing_factor',

    DRY_MULTIPLIER = 'dry_multiplier',
    DRY_BASE = 'dry_base',
    DRY_ALLOWED_LENGTH = 'dry_allowed_length',
    DRY_SEQUENCE_BREAK = 'dry_sequence_break',

    XTC_THRESHOLD = 'xtc_threshold',
    XTC_PROBABILITY = 'xtc_probability',
    //...
}

type InputType = 'slider' | 'textinput' | 'checkbox' | 'custom'

type SamplerStringItem = { type: 'string'; default: string }

type SamplerNumberItem = {
    type: 'integer' | 'float'
    default: number
    min: number
    max: number
    step: number
    precision?: number
}

type SamplerObjectItem = { type: 'object'; default: object }

type SamplerBooleanItem = { type: 'boolean'; default: boolean }

type SamplerItemValues =
    | SamplerStringItem
    | SamplerBooleanItem
    | SamplerNumberItem
    | SamplerObjectItem

export type SamplerItem = {
    internalID: SamplerID
    friendlyName: string
    inputType: InputType
    values: SamplerItemValues
}

export const Samplers = {
    /*Default Sampler definitions here*/

    [SamplerID.CONTEXT_LENGTH]: {
        internalID: SamplerID.CONTEXT_LENGTH,
        friendlyName: 'Max Context',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 1024,
            max: 32769,
            default: 4098,
            step: 16,
            precision: 0,
        },
    },
    [SamplerID.STREAMING]: {
        internalID: SamplerID.STREAMING,
        friendlyName: 'Streaming',
        inputType: 'checkbox',
        values: {
            type: 'boolean',
            default: true,
        },
    },
    [SamplerID.GENERATED_LENGTH]: {
        internalID: SamplerID.GENERATED_LENGTH,
        friendlyName: 'Generated Tokens',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 16,
            max: 8192,
            default: 256,
            step: 1,
            precision: 0,
        },
    },
    [SamplerID.TEMPERATURE]: {
        internalID: SamplerID.TEMPERATURE,
        friendlyName: 'Temperature',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0.01,
            max: 10,
            default: 1,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.DYNATEMP_RANGE]: {
        internalID: SamplerID.DYNATEMP_RANGE,
        friendlyName: 'Dynamic Temperature Range',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0.01,
            max: 10,
            default: 1,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.MIN_P]: {
        internalID: SamplerID.MIN_P,
        friendlyName: 'Min P',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 1,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.XTC_PROBABILITY]: {
        internalID: SamplerID.XTC_PROBABILITY,
        friendlyName: 'XTC Probability',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 1,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.XTC_THRESHOLD]: {
        internalID: SamplerID.XTC_THRESHOLD,
        friendlyName: 'XTC Threshold',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 1,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.TOP_P]: {
        internalID: SamplerID.TOP_P,
        friendlyName: 'Top P',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 1,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.TOP_A]: {
        internalID: SamplerID.TOP_A,
        friendlyName: 'Top A',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 1,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.TOP_K]: {
        internalID: SamplerID.TOP_K,
        friendlyName: 'Top K',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 1,
            max: 100,
            default: 100,
            step: 1,
            precision: 0,
        },
    },
    [SamplerID.REPETITION_PENALTY]: {
        internalID: SamplerID.REPETITION_PENALTY,
        friendlyName: 'Repetition Penalty',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 1,
            max: 1.5,
            default: 1,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.REPETITION_PENALTY_RANGE]: {
        internalID: SamplerID.REPETITION_PENALTY_RANGE,
        friendlyName: 'Repetition Penalty Range',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 1,
            max: 4096,
            default: 1,
            step: 1,
            precision: 0,
        },
    },
    [SamplerID.REPETITION_PENALTY_SLOPE]: {
        internalID: SamplerID.REPETITION_PENALTY_SLOPE,
        friendlyName: 'Repetition Penalty Slope',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 1,
            max: 10,
            default: 1,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.ENCODER_REPETITION_PENALTY]: {
        internalID: SamplerID.ENCODER_REPETITION_PENALTY,
        friendlyName: 'Encoder Repetition Penalty',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0.8,
            max: 1.5,
            default: 1,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.FREQUENCY_PENALTY]: {
        internalID: SamplerID.FREQUENCY_PENALTY,
        friendlyName: 'Frequency Penalty',
        inputType: 'slider',
        values: {
            type: 'float',
            min: -2,
            max: 2,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.PRESENCE_PENALTY]: {
        internalID: SamplerID.PRESENCE_PENALTY,
        friendlyName: 'Presence Penalty',
        inputType: 'slider',
        values: {
            type: 'float',
            min: -2,
            max: 2,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.NO_REPEAT_NGRAM_SIZE]: {
        internalID: SamplerID.NO_REPEAT_NGRAM_SIZE,
        friendlyName: 'No Repeat Ngram Size',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 0,
            max: 20,
            default: 0,
            step: 1,
            precision: 0,
        },
    },
    [SamplerID.MIN_LENGTH]: {
        internalID: SamplerID.MIN_LENGTH,
        friendlyName: 'Minimum Length',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 0,
            max: 2048,
            default: 0,
            step: 1,
            precision: 0,
        },
    },
    [SamplerID.SMOOTHING_FACTOR]: {
        internalID: SamplerID.SMOOTHING_FACTOR,
        friendlyName: 'Smoothing Factor',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 10,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.TYPICAL]: {
        internalID: SamplerID.TYPICAL,
        friendlyName: 'Typical Sampling',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 1,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.TAIL_FREE_SAMPLING]: {
        internalID: SamplerID.TAIL_FREE_SAMPLING,
        friendlyName: 'Tail-Free Sampling',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 1,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.EPSILON_CUTOFF]: {
        internalID: SamplerID.EPSILON_CUTOFF,
        friendlyName: 'Epsilon Cutoff',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 9,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.ETA_CUTOFF]: {
        internalID: SamplerID.ETA_CUTOFF,
        friendlyName: 'Eta Cutoff',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 20,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.MIROSTAT_MODE]: {
        internalID: SamplerID.MIROSTAT_MODE,
        friendlyName: 'Mirostat Mode',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 0,
            max: 2,
            default: 0,
            step: 1,
            precision: 0,
        },
    },
    [SamplerID.MIROSTAT_TAU]: {
        internalID: SamplerID.MIROSTAT_TAU,
        friendlyName: 'Mirostat Tau',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 20,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.MIROSTAT_ETA]: {
        internalID: SamplerID.MIROSTAT_ETA,
        friendlyName: 'Mirostat Eta',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 1,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.BAN_EOS_TOKEN]: {
        internalID: SamplerID.BAN_EOS_TOKEN,
        friendlyName: 'Ban EOS tokens',
        inputType: 'checkbox',
        values: {
            type: 'boolean',
            default: false,
        },
    },
    [SamplerID.ADD_BOS_TOKEN]: {
        internalID: SamplerID.ADD_BOS_TOKEN,
        friendlyName: 'Add BOS Token',
        inputType: 'checkbox',
        values: {
            type: 'boolean',
            default: true,
        },
    },
    [SamplerID.DO_SAMPLE]: {
        internalID: SamplerID.DO_SAMPLE,
        friendlyName: 'Do Sample',
        inputType: 'checkbox',
        values: {
            type: 'boolean',
            default: false,
        },
    },
    [SamplerID.SKIP_SPECIAL_TOKENS]: {
        internalID: SamplerID.SKIP_SPECIAL_TOKENS,
        friendlyName: 'Skip Special Token',
        inputType: 'checkbox',
        values: {
            type: 'boolean',
            default: false,
        },
    },
    [SamplerID.SINGLE_LINE]: {
        internalID: SamplerID.SINGLE_LINE,
        friendlyName: 'Single Line',
        inputType: 'checkbox',
        values: {
            type: 'boolean',
            default: false,
        },
    },
    [SamplerID.GRAMMAR_STRING]: {
        internalID: SamplerID.GRAMMAR_STRING,
        friendlyName: 'Grammar',
        inputType: 'textinput',
        values: {
            type: 'string',
            default: '',
        },
    },
    [SamplerID.SEED]: {
        internalID: SamplerID.SEED,
        friendlyName: 'Seed',
        inputType: 'slider',
        values: {
            type: 'integer',
            default: -1,
            min: -1,
            max: 100000,
            step: 1,
            precision: 0,
        },
    },
    // THIS MAY BE AN ARRAY OBJECT
    [SamplerID.BANNED_TOKENS]: {
        internalID: SamplerID.BANNED_TOKENS,
        friendlyName: 'Banned Tokens',
        inputType: 'textinput',
        values: {
            type: 'string',
            default: '',
        },
    },
    [SamplerID.GUIDANCE_SCALE]: {
        internalID: SamplerID.GUIDANCE_SCALE,
        friendlyName: 'CFG Scale',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0.01,
            max: 4,
            default: 0.01,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.NEGATIVE_PROMPT]: {
        internalID: SamplerID.NEGATIVE_PROMPT,
        friendlyName: 'Negative Prompt',
        inputType: 'textinput',
        values: {
            type: 'string',
            default: '',
        },
    },
    [SamplerID.NUM_BEAMS]: {
        internalID: SamplerID.NUM_BEAMS,
        friendlyName: 'Number of Beams',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 1,
            max: 20,
            default: 1,
            step: 1,
            precision: 0,
        },
    },
    [SamplerID.EARLY_STOPPING]: {
        internalID: SamplerID.EARLY_STOPPING,
        friendlyName: 'Early Stopping',
        inputType: 'checkbox',
        values: {
            type: 'boolean',
            default: false,
        },
    },
    [SamplerID.LENGTH_PENALTY]: {
        internalID: SamplerID.LENGTH_PENALTY,
        friendlyName: 'Length Penalty',
        inputType: 'slider',
        values: {
            type: 'float',
            min: -5,
            max: 5,
            default: 0,
            step: 0.1,
            precision: 1,
        },
    },
    [SamplerID.PENALTY_ALPHA]: {
        internalID: SamplerID.PENALTY_ALPHA,
        friendlyName: 'Penalty Alpha',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 5,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.DRY_MULTIPLIER]: {
        internalID: SamplerID.DRY_MULTIPLIER,
        friendlyName: 'Dry Multiplier',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 10,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.DRY_BASE]: {
        internalID: SamplerID.DRY_BASE,
        friendlyName: 'Dry Base',
        inputType: 'slider',
        values: {
            type: 'float',
            min: 0,
            max: 10,
            default: 0,
            step: 0.01,
            precision: 2,
        },
    },
    [SamplerID.DRY_ALLOWED_LENGTH]: {
        internalID: SamplerID.DRY_ALLOWED_LENGTH,
        friendlyName: 'Dry Allowed Length',
        inputType: 'slider',
        values: {
            type: 'integer',
            min: 0,
            max: 8196,
            default: 0,
            step: 1,
            precision: 0,
        },
    },
    [SamplerID.DRY_SEQUENCE_BREAK]: {
        internalID: SamplerID.DRY_SEQUENCE_BREAK,
        friendlyName: 'Dry Sequence Break',
        inputType: 'textinput',
        values: {
            type: 'string',
            default: '',
        },
    },
} as const

type ValueType<V extends SamplerItemValues> = V extends SamplerStringItem
    ? string
    : V extends SamplerObjectItem
      ? object
      : V extends SamplerNumberItem
        ? number
        : boolean

type SamplerValueMap = {
    [ID in keyof typeof Samplers]: ValueType<(typeof Samplers)[ID]['values']>
}

export type SamplerPreset = {
    -readonly [ID in keyof SamplerValueMap]: SamplerValueMap[ID]
}
