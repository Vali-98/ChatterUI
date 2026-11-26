import { Paths } from 'expo-file-system'

export const AppDirectory = {
    ModelPath: `${Paths.document.uri}models/`,
    SessionPath: `${Paths.document.uri}session/`,
    CharacterPath: `${Paths.document.uri}characters/`,
    Assets: `${Paths.document.uri}appAssets/`,
    Attachments: `${Paths.document.uri}attachments/`,
}

export const tokenizerFilename = 'llama3tokenizer.gguf'
