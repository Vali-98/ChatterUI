import { useShallow } from 'zustand/react/shallow'

import { loadChat } from './actions'
import { useChatState } from './state'

export const useChat = () => {
    const selection = useChatState(
        useShallow((state) => ({
            chatId: state.id,
            scrollData: state.scrollData,
            resetId: state.reset,
        }))
    )
    return { ...selection, setId: loadChat }
}
