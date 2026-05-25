import { create } from 'zustand'

import { NoteType } from '../AuthorNotes'

type AuthorNoteEditorStateProps = {
    visible: boolean
    setVisible: (show: boolean, noteId?: number) => void
    noteId?: number
}

export const authorNoteEditorState = create<AuthorNoteEditorStateProps>()((set) => ({
    visible: false,
    setVisible: (visible, noteId) => set({ visible, noteId }),
}))

type AuthorNoteBodyStateProps = {
    currentNoteType: NoteType
    setCurrentNoteType: (type: NoteType) => void
}

export const authorNoteBodyState = create<AuthorNoteBodyStateProps>()((set, get) => ({
    currentNoteType: NoteType.CHAT,
    setCurrentNoteType: (type) => {
        if (get().currentNoteType === type) return
        set({ currentNoteType: type })
    },
}))
