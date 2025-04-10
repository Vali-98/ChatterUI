import { Storage } from '@lib/enums/Storage'
import { mmkvStorage } from '@lib/storage/MMKV'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type AppMode = 'local' | 'remote'

type AppModeStateProps = {
    appMode: AppMode
    setAppMode: (mode: AppMode) => void
}

export const useAppModeState = create<AppModeStateProps>()(
    persist(
        (set) => ({
            appMode: 'local',
            setAppMode: (mode) => {
                set((state) => ({ ...state, appMode: mode }))
            },
        }),
        {
            name: Storage.AppMode,
            storage: createJSONStorage(() => mmkvStorage),
            partialize: (state) => ({ appMode: state.appMode }),
            version: 1,
        }
    )
)

export const useAppMode = () => {
    const { appMode, setAppMode } = useAppModeState((state) => ({
        appMode: state.appMode,
        setAppMode: state.setAppMode,
    }))

    return { appMode, setAppMode }
}
