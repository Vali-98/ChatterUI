export const enum Global {
    // Processing

    NowGenerating = 'nowgenerating', // generation signal
    EditedWindow = 'editedwindow', // exit editing window confirmation
    //Messages = 'messages',
    Logs = 'logs',
    RecentMessages = 'recentmessages',
    // Character

    CurrentCharacter = 'currentchar', // current char filename, locates dir
    CurrentCharacterCard = 'charcard', // note: use Object ? - stores charactercard

    // User

    CurrentUser = 'currentuser', // current username, locates dir
    CurrentUserCard = 'usercard', // note: use Object ? - stores usercard

    // Chat

    // CurrentChat = 'currentchat', // current chat filename, locates dir

    // Instruct

    InstructName = 'instructname', // name of current instruct preset
    CurrentInstruct = 'currentinstruct', // note: use Object ? - stores instruct

    // Presets

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
}
