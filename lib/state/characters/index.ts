import * as characterActions from './actions'
import { db as characterDb } from './db'
import { getCardImageUri as characterImageUri } from './images'
import { toCharacterCardV2 as convertToCharacterCardV2 } from './schema'
import { useCharacterState as characterState } from './state'
import { useUserStore as userStore } from './store'

export type { CharacterCardSummary, CharacterTokenCounts, CharacterCard } from './types'

export namespace Characters {
    export const db = characterDb
    export const useUserStore = userStore
    export const useCharacterState = characterState
    export const getCardImageUri = characterImageUri
    export const actions = characterActions
    export const toCharacterCardV2 = convertToCharacterCardV2
}
