import * as characterActions from './actions'
import { db as characterDb } from './db'
import { getImageDir as characterImageDir } from './images'
import { convertDBDataToCV2 as convertCharacterCard } from './schema'
import { useCharacterState } from './state'
import { useUserStore as userStore } from './store'

export type { CharInfo, CharacterTokenCache, CharacterCardData } from './types'

export namespace Characters {
    export const db = characterDb
    export const useUserStore = userStore
    export const useCharacterStore = useCharacterState
    export const getImageDir = characterImageDir
    export const actions = characterActions
    export const convertDBDataToCV2 = convertCharacterCard
}
