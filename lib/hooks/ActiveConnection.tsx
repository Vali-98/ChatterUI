import { useMemo } from 'react'

import { APIManager } from '@lib/engine/API/APIManagerState'

export const useActiveConnection = () => {
    const { activeIndex, values, getTemplates } = APIManager.useConnectionsStore()

    const activeConnection = useMemo(() => {
        return values?.[activeIndex] ?? undefined
    }, [activeIndex, values])

    return {
        activeConnection: activeConnection,
        activeTemplate: getTemplates().find((item) => item.name === activeConnection.configName),
    }
}
