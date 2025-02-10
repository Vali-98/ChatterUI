import { AppSettings } from '@lib/constants/GlobalValues'
import { mmkv } from '@lib/storage/MMKV'
import { DeviceType, getDeviceTypeAsync } from 'expo-device'
import { lockAsync, OrientationLock } from 'expo-screen-orientation'

export const lockScreenOrientation = async () => {
    const result = await getDeviceTypeAsync()
    const unlock = mmkv.getBoolean(AppSettings.UnlockOrientation)
    if (unlock ?? result === DeviceType.TABLET) return
    lockAsync(OrientationLock.PORTRAIT)
}

export const unlockScreenOrientation = async () => {
    await unlockScreenOrientation()
}
