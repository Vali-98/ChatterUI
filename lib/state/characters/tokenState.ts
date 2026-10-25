import { useEffect } from 'react'
import { create } from 'zustand'

import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { useAppModeStore } from '@lib/state/AppMode'
import { Logger } from '@lib/state/Logger'
import { createMacroValues } from '@lib/utils/Macros'

import { useCharacterState } from './state'
import { useUserStore } from './store'
import { countTokenText, prepareTokenText } from './tokenCache'
import type { CharacterCardData, CharacterTokenCache } from './types'

type TokenCounts = { characterCache: CharacterTokenCache; userCache: CharacterTokenCache }
type TokenState = {
    key?: string
    characterId?: number
    userId?: number
    model?: unknown
    tokenizer?: (text: string) => Promise<number>
    counts?: TokenCounts
    getCounts: (
        character: NonNullable<CharacterCardData>,
        user: NonNullable<CharacterCardData>
    ) => Promise<TokenCounts>
}

export const useCharacterTokenState = create<TokenState>()((set, get) => ({
    getCounts: async (character, user) => {
        const values = createMacroValues({ char: character.name, user: user.name })
        const characterText = prepareTokenText(character, values)
        const userText = prepareTokenText(user, values)
        const key = JSON.stringify([
            character.id,
            user.id,
            character.name,
            user.name,
            characterText,
            userText,
        ])
        const tokenizer = Tokenizer.getTokenizer()
        const model =
            useAppModeStore.getState().appMode === 'local'
                ? Llama.useLlamaModelStore.getState().context
                : Tokenizer.useTokenizerState.getState().model
        const cached = get()
        if (
            cached.key === key &&
            cached.tokenizer === tokenizer &&
            cached.model === model &&
            cached.counts
        )
            return cached.counts
        set({
            key: key,
            characterId: character.id,
            userId: user.id,
            tokenizer: tokenizer,
            model: model,
            counts: undefined,
        })
        const [characterCache, userCache] = await Promise.all([
            countTokenText(characterText, user.name, tokenizer),
            countTokenText(userText, character.name, tokenizer),
        ])
        const counts = { characterCache, userCache }
        // An older calculation may finish after a different selection/model was requested.
        if (get().key === key && get().tokenizer === tokenizer && get().model === model)
            set({ counts })
        return counts
    },
}))

export const useCharacterTokenCounts = () => {
    const character = useCharacterState((state) => state.card)
    const user = useUserStore((state) => state.card)
    const mode = useAppModeStore((state) => state.appMode)
    const localModel = Llama.useLlamaModelStore((state) => state.context)
    const remoteModel = Tokenizer.useTokenizerState((state) => state.model)
    const entry = useCharacterTokenState()
    const getCounts = entry.getCounts
    useEffect(() => {
        if (character && user) getCounts(character, user).catch(Logger.error)
    }, [character, user, mode, localModel, remoteModel, getCounts])
    const model = mode === 'local' ? localModel : remoteModel
    return character &&
        user &&
        entry.characterId === character.id &&
        entry.userId === user.id &&
        entry.model === model &&
        entry.tokenizer === Tokenizer.getTokenizer()
        ? entry.counts
        : undefined
}
