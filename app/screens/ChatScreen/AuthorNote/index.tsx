import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import BottomSheet, { BottomSheetRef, createBottomSheetRef } from '@components/views/BottomSheet'

import AuthorNoteBody from './AuthorNoteBody'

type AuthorNoteState = {
    ref: BottomSheetRef
    open: () => void
    close: () => void
}

export const useAuthorNoteState = create<AuthorNoteState>()((set, get) => ({
    ref: createBottomSheetRef(),
    open: () => {
        get().ref?.current?.open()
    },
    close: () => {
        get().ref?.current?.close()
    },
}))

const AuthorNoteSheet = () => {
    const ref = useAuthorNoteState(useShallow((state) => state.ref))

    return (
        <BottomSheet sheetStyle={{ flex: 1 }} ref={ref}>
            <AuthorNoteBody />
        </BottomSheet>
    )
}

export default AuthorNoteSheet
