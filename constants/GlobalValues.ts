export const enum Global {
    // Removed - These values are archived incase future issues arise due to unhandled cases

    //CurrentCharacter = 'currentchar', // current char filename, locates dir   == removed on db migration
    //CurrentCharacterCard = 'charcard', // note: use Object ? - stores charactercard   == removed on db migration

    //InstructName = 'instructname', // name of current instruct preset == removed on db migration
    //CurrentInstruct = 'currentinstruct', // note: use Object ? - stores instruct == removed on db migration

    //CurrentUser = 'currentuser', // current username, locates dir == removed on db migration
    //CurrentUserCard = 'usercard', // note: use Object ? - stores usercard == removed on db migration

    // CurrentChat = 'currentchat', // current chat filename, locates dir    == removed on db migration
    //Messages = 'messages', === removed on zustand migration

    // EditedWindow = 'editedwindow', // exit editing window confirmation == never used

    // App

    GenerateDefaultInstructs = 'generatedefaultinstructs',

    // Processing

    NowGenerating = 'nowgenerating', // generation signal

    // Management

    Logs = 'logs',
    RecentMessages = 'recentmessages',

    // Character

    // User

    UserID = 'userid',

    // Chat

    // Instruct

    InstructID = 'instructid',

    // Presets

    PresetID = 'presetID',
    PresetData = 'presetdata',
    PresetName = 'presetdame',

    // Lorebooks

    LorebookNames = 'lorebooknames',

    // APIs

    APIType = 'endpointtype', // name of current api mode

    KAIEndpoint = 'kaiendpoint', // kai api endpoint

    TGWUIStreamingEndpoint = 'tgwuistreamingendpoint', // tgwui streaming web socket

    HordeKey = 'hordekey', // api key for horde
    HordeModels = 'hordemodel', // names of horde models to be used
    HordeWorkers = 'hordeworker', // List of available horde workers

    MancerKey = 'mancerkey', // api key for mancer
    MancerModel = 'mancermodel', // selected mancer model

    NovelKey = 'novelkey', // novelai key
    NovelModel = 'novelmodel', // novelai model

    AphroditeKey = 'aphroditekey', // api key for aphrodite, default is `EMPTY`

    CompletionsEndpoint = 'completionsendpoint',
    CompletionsKey = 'completionskey',
    CompletionsModel = 'completionsModel',

    OpenAIKey = 'openaikey',
    OpenAIModel = 'openaimodel',

    // Local

    LocalModel = 'localmodel',
    LocalModelWeights = 'localdata',
    LocalPreset = 'localpreset',

    OpenRouterModel = 'openroutermodel',
    OpenRouterKey = 'openrouterkey',

    TTSSpeaker = 'ttsspeaker',
    TTSEnable = 'ttsenable',
    TTSAuto = `ttsauto`,
    TTSAutoStart = 'ttsautostart',
}

export enum GenerationSettings {
    DisableFirst = 'disablefirst',
    UseFormatter = 'useformatter',
    FormatterTarget = 'formattertarget',
    FormatterSource = 'formattersource',
}

export enum AppSettings {
    DevMode = 'devmode',
    PrimaryHue = 'primaryhue',
}
