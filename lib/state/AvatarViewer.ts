import { create } from 'zustand'

type ViewerStateProps = {
    showViewer: boolean
    isUser: boolean
    setShow: (showState: boolean, isUser?: boolean) => void
}

export const useViewerState = create<ViewerStateProps>()((set) => ({
    showViewer: false,
    isUser: false,
    setShow: (showState: boolean, isUser: boolean = false) =>
        set((state) => ({ ...state, showViewer: showState, isUser: isUser })),
}))
