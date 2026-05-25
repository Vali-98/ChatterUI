import { create } from 'zustand'

import BottomSheet from '@components/views/BottomSheet'

import AuthorNoteBody from './AuthorNoteBody'

type AuthorNoteState = {
    visible: boolean
    setVisible: (b: boolean) => void
}

export const useAuthorNoteState = create<AuthorNoteState>()((set, get) => ({
    visible: false,
    setVisible: (b) => {
        set({ visible: b })
    },
}))

const AuthorNoteSheet = () => {
    const { visible, setVisible } = useAuthorNoteState()

    if (!visible) return

    return (
        <BottomSheet sheetStyle={{ flex: 1 }} visible={visible} setVisible={setVisible}>
            <AuthorNoteBody />
        </BottomSheet>
    )
}

export default AuthorNoteSheet
