import { getBackendDevicesInfo } from 'cui-llama.rn'
import { useEffect, useState } from 'react'

import { Logger } from '@lib/state/Logger'

const useBackendDevices = () => {
    const [devices, setDevices] = useState<string[]>([])

    useEffect(() => {
        getBackendDevicesInfo()
            .then((devices) => {
                setDevices(devices.map((item) => item.deviceName))
            })
            .catch((e) => {
                Logger.warn('Failed to get backend devices: ' + e)
            })
    }, [setDevices])

    return devices
}

export default useBackendDevices
