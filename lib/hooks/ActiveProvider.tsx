import { useMMKVBoolean } from 'react-native-mmkv'

import { AppSettings } from '@lib/constants/appSettings'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { useAppMode } from '@lib/state/AppMode'

import { useActiveConnection } from './ActiveConnection'

export const useActiveProvider = () => {
    const { appMode } = useAppMode()
    const { model } = Llama.useLlamaModelStore()
    const { activeConnection } = useActiveConnection()
    const [autoLoad] = useMMKVBoolean(AppSettings.AutoLoadLocal)

    if (appMode === 'local') return { mode: 'local', available: !!model || autoLoad }
    return { mode: 'remote', available: !!activeConnection }
}
