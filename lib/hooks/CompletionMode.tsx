import { useMMKVBoolean } from 'react-native-mmkv'

import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'

import { useActiveConnection } from './ActiveConnection'

export const useCompletionMode = () => {
    const { appMode } = useAppMode()
    const { activeTemplate } = useActiveConnection()
    const [localTemplate] = useMMKVBoolean(AppSettings.UseModelTemplate)

    // local mode: return based on template usage
    if (appMode === 'local') return localTemplate ? 'chatCompletions' : 'textCompletions'

    // remote mode: return based on config type
    const completionType = activeTemplate?.request.completionType.type
    if (completionType) return completionType

    // default if all else fails
    return 'chatCompletions'
}
