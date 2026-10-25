import { useActiveConnectionTemplate } from '@lib/engine/API/connectionStore'

export const useActiveConnection = () => {
    const { apiValue, apiConfig } = useActiveConnectionTemplate()
    return { activeConnection: apiValue, activeTemplate: apiConfig }
}
