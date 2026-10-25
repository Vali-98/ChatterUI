import { create } from 'zustand'

import { createCardSelection } from './selection'
import type { CharacterCardState } from './types'

const selection = createCardSelection()
export const useCharacterState = create<CharacterCardState>()(selection.initializer)
selection.bind(useCharacterState)
