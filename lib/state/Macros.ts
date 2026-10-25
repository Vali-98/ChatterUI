import { applyMacros, createMacroValues, MacroValues } from '@lib/utils/Macros'

import { useCharacterState } from './characters/state'
import { useUserStore } from './characters/store'

export type { MacroValues } from '@lib/utils/Macros'

export const getActiveMacros = ({ temporal = true }: { temporal?: boolean } = {}): MacroValues =>
    createMacroValues(
        {
            char: useCharacterState.getState().card?.name ?? '',
            user: useUserStore.getState().card?.name ?? '',
        },
        temporal ? new Date() : null
    )

export const replaceMacros = (text: string, values: MacroValues = getActiveMacros()): string =>
    applyMacros(text ?? '', values)
