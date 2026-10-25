import { useEffect } from 'react'
import { create } from 'zustand'

import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { useAppModeStore } from '@lib/state/AppMode'
import { Logger } from '@lib/state/Logger'
import { createMacroValues } from '@lib/utils/Macros'

import { useCharacterState } from './state'
import { useUserStore } from './store'
import { countCharacterTokens, prepareCharacterTokenText } from './tokenCache'
import type { CharacterCard, CharacterTokenCounts } from './types'

type ParticipantTokenCounts = {
    characterCounts: CharacterTokenCounts
    userCounts: CharacterTokenCounts
}
type CharacterTokenState = {
    key?: string
    characterId?: number
    userId?: number
    model?: unknown
    tokenizer?: (text: string) => Promise<number>
    counts?: ParticipantTokenCounts
    countTokens: (character: CharacterCard, user: CharacterCard) => Promise<ParticipantTokenCounts>
}

export const useCharacterTokenState = create<CharacterTokenState>()((set, get) => ({
    countTokens: async (character, user) => {
        const values = createMacroValues({ char: character.name, user: user.name })
        const characterText = prepareCharacterTokenText(character, values)
        const userText = prepareCharacterTokenText(user, values)
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
        const [characterCounts, userCounts] = await Promise.all([
            countCharacterTokens(characterText, {
                otherParticipantName: user.name,
                tokenizer: tokenizer,
            }),
            countCharacterTokens(userText, {
                otherParticipantName: character.name,
                tokenizer: tokenizer,
            }),
        ])
        const counts = { characterCounts, userCounts }
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
    const countTokens = entry.countTokens
    useEffect(() => {
        if (character && user) countTokens(character, user).catch(Logger.error)
    }, [character, user, mode, localModel, remoteModel, countTokens])
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
