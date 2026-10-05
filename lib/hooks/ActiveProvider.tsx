import { useMMKVBoolean } from 'react-native-mmkv'

import { AppSettings } from '@lib/constants/GlobalValues'
import { APIManager } from '@lib/engine/API/APIManagerState'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { useAppMode } from '@lib/state/AppMode'

export const useActiveProvider = () => {
    const { appMode } = useAppMode()
    const { model } = Llama.useLlamaModelStore()
    const { activeIndex } = APIManager.useConnectionsStore()
    const [autoLoad] = useMMKVBoolean(AppSettings.AutoLoadLocal)

    if (appMode === 'local') return { mode: 'local', available: !!model || autoLoad }
    return { mode: 'remote', available: activeIndex !== -1 }
}
