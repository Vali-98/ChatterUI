import { getDocumentAsync } from 'expo-document-picker'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'
import { AppDirectory, copyFile, deleteFile } from '@lib/utils/File'

import { Logger } from './Logger'

type BackgroundImageStateProps = {
    image?: string
    importImage: () => void
    removeImage: () => void
}

export const useBackgroundStore = create<BackgroundImageStateProps>()(
    persist(
        (set, get) => ({
            image: undefined,

            importImage: async () => {
                try {
                    const result = await getDocumentAsync({
                        copyToCacheDirectory: true,
                        type: 'image/*',
                    })
                    if (result.canceled) return
                    const uri = result.assets[0].uri
                    const name = result.assets[0].name
                    copyFile({ from: uri, to: AppDirectory.Assets + name })

                    set({ image: name })
                    Logger.infoToast('Successfully Imported!')
                } catch (e) {
                    Logger.error('Something went wrong with importing: ' + e)
                }
            },
            removeImage: () => {
                const imageName = get().image
                if (imageName) deleteFile(AppDirectory.Assets + imageName)
                set({ image: undefined })
                Logger.warnToast('Background Deleted!')
            },
        }),
        {
            name: Storage.BackgroundImage,
            partialize: (state) => ({ image: state.image }),
            storage: createMMKVStorage(),
            version: 1,
        }
    )
)
