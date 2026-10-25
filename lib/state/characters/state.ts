import { create } from 'zustand'

import { createCardSelection } from './selection'
import type { CharacterCardSelectionState } from './types'

const selection = createCardSelection()
export const useCharacterState = create<CharacterCardSelectionState>()(selection.initializer)
selection.bind(useCharacterState)
