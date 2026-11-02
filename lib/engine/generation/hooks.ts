import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import { AppSettings } from '@lib/constants/appSettings'
import { useAppModeStore } from '@lib/state/AppMode'

import { useDeferredTaskState, isDeferredTaskRunning, dismissDeferredTask } from './deferredState'
import { useLocalModelResourceState } from './localResource'
import { cancelDeferredTask } from './scheduler'
import { isActiveGeneration, useGenerationState } from './state'

export const useChatGenerating = (chatId?: number) =>
    useGenerationState((state) =>
        Object.values(state.generations).some(
            (item) => item.chatId === chatId && isActiveGeneration(item)
        )
    )

export const useSwipeGeneration = (swipeId: number) =>
    useGenerationState((state) =>
        Object.values(state.generations).find((item) => item.swipeId === swipeId)
    )

export const useCanStartGeneration = (chatId?: number) => {
    const mode = useAppModeStore((state) => state.appMode)
    const [concurrent] = useMMKVBoolean(AppSettings.ConcurrentGenerations)
    // Derive availability from subscribed values. Discarded subscriptions followed by an
    // imperative read can leave React Compiler caching the old result for this chat/mode.
    const generationBlocked = useGenerationState((state) =>
        Object.values(state.generations).some(
            (item) =>
                (item.chatId === chatId &&
                    (isActiveGeneration(item) || (!!item.error && !item.persisted))) ||
                (isActiveGeneration(item) &&
                    (concurrent === false || (mode === 'local' && item.mode === 'local')))
        )
    )
    const deferredBlocked = useDeferredTaskState((state) =>
        Object.values(state.tasks).some(
            (task) =>
                isDeferredTaskRunning(task) &&
                (concurrent === false || (mode === 'local' && task.mode === 'local'))
        )
    )
    const modelBusy = useLocalModelResourceState((state) => state.operations > 0)
    return (
        chatId !== undefined &&
        !generationBlocked &&
        !deferredBlocked &&
        !(mode === 'local' && modelBusy)
    )
}

export const useDeferredTasks = (chatId?: number) =>
    useDeferredTaskState(
        useShallow((state) =>
            Object.values(state.tasks).filter(
                (task) => chatId === undefined || task.chatId === chatId
            )
        )
    )
export const useDeferredTask = (id: number) => {
    const task = useDeferredTaskState((state) => state.tasks[id])
    return {
        task: task,
        cancel: () => cancelDeferredTask(id),
        dismiss: () => dismissDeferredTask(id),
    }
}
