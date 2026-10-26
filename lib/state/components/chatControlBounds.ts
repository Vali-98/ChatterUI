import { makeMutable } from 'react-native-reanimated'

import type { ControlBounds } from '@lib/utils/controlPlacement'

// Window coordinates let the app-wide player avoid the chat's swipe controls.
export const chatSwipeControlBounds = makeMutable<(ControlBounds & { entryId: number }) | null>(
    null
)
export const chatControlLift = makeMutable(0)
