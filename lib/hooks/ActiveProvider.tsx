import { APIManager } from '@lib/engine/API/APIManagerState'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { useAppMode } from '@lib/state/AppMode'

export const useActiveProvider = () => {
    const { appMode } = useAppMode()
    const { model } = Llama.useLlamaModelStore()
    const { activeIndex } = APIManager.useConnectionsStore()

    if (appMode === 'local') return { mode: 'local', available: !!model }
    return { mode: 'remote', available: activeIndex !== -1 }
}
