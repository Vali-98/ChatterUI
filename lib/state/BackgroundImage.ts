import { Storage } from '@lib/enums/Storage'
import { mmkvStorage } from '@lib/storage/MMKV'
import { AppDirectory } from '@lib/utils/File'
import { getDocumentAsync } from 'expo-document-picker'
import { copyAsync, deleteAsync } from 'expo-file-system'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { Logger } from './Logger'

type BackgroundImageStateProps = {
    image?: string
    importImage: () => void
    removeImage: () => void
}

export const useBackgroundImage = create<BackgroundImageStateProps>()(
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
                    await copyAsync({ from: uri, to: AppDirectory.Assets + name })

                    set((state) => ({ ...state, image: name }))
                    Logger.infoToast('Successfully Imported!')
                } catch (e) {
                    Logger.error('Something went wrong with importing: ' + e)
                }
            },
            removeImage: () => {
                const imageName = get().image
                if (imageName) deleteAsync(AppDirectory.Assets + imageName, { idempotent: true })
                set((state) => ({ ...state, image: undefined }))
                Logger.warnToast('Background Deleted!')
            },
        }),
        {
            name: Storage.BackgroundImage,
            partialize: (state) => ({ image: state.image }),
            storage: createJSONStorage(() => mmkvStorage),
            version: 1,
        }
    )
)
