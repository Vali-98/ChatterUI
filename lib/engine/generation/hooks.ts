import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import { AppSettings } from '@lib/constants/appSettings'
import { useAppModeStore } from '@lib/state/AppMode'

import { useDeferredTaskState, isDeferredTaskRunning, dismissDeferredTask } from './deferredState'
import { useLocalModelResourceState } from './localResource'
import { canStartGeneration, cancelDeferredTask } from './scheduler'
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
    // Subscribe to lifecycle state, not just the selected chat; another task may release capacity.
    useGenerationState((state) =>
        Object.values(state.generations)
            .filter((item) => isActiveGeneration(item) || (!!item.error && !item.persisted))
            .map((item) => item.id)
            .join(',')
    )
    useDeferredTaskState((state) =>
        Object.values(state.tasks)
            .filter(isDeferredTaskRunning)
            .map((task) => task.id)
            .join(',')
    )
    useLocalModelResourceState((state) => state.operations)
    void concurrent
    return chatId !== undefined && canStartGeneration(chatId, mode)
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
