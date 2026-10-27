import { randomUUID } from 'expo-crypto'
import { getDocumentAsync } from 'expo-document-picker'
import { t } from 'i18next'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'
import { AppDirectory, copyFile, deleteFile } from '@lib/utils/File'

import { Logger } from './Logger'

type BackgroundImageStateProps = {
    image?: string
    importImage: () => Promise<void>
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
                    const name = `background-${randomUUID()}-${result.assets[0].name}`
                    const path = AppDirectory.Assets + name
                    if (!(await copyFile({ from: uri, to: path }))) {
                        deleteFile(path)
                        Logger.errorToast(t('common.errors.failedToCopy'))
                        return
                    }
                    const previousImage = get().image
                    set({ image: name })
                    if (previousImage) deleteFile(AppDirectory.Assets + previousImage)
                    Logger.infoToast(t('common.messages.successfullyImported'))
                } catch (e) {
                    Logger.error('Something went wrong with importing: ' + e)
                }
            },
            removeImage: () => {
                const imageName = get().image
                if (imageName) deleteFile(AppDirectory.Assets + imageName)
                set({ image: undefined })
                Logger.warnToast(t('settings.style.messages.backgroundDeleted'))
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
