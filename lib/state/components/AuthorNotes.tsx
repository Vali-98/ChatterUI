import { create } from 'zustand'

import { BottomSheetRef, createBottomSheetRef } from '@components/views/BottomSheet'

import { NoteType } from '../AuthorNotes'

type AuthorNoteEditorStateProps = {
    ref: BottomSheetRef | null
    open: (noteId: number) => void
    close: () => void
    noteId?: number
}

export const authorNoteEditorState = create<AuthorNoteEditorStateProps>()((set, get) => ({
    ref: createBottomSheetRef(),
    open: (noteId) => {
        get().ref?.current?.open()
        set({ noteId })
    },
    close: () => {
        get().ref?.current?.close()
    },
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
