import { getTotalMemory } from '@vali98/react-native-cpu-info'

import { runBackgroundTask } from '@lib/background/service'
import { Model } from '@lib/engine/Local/Model'
import { Logger } from '@lib/state/Logger'
import { AppDirectory } from '@lib/utils/File'

import { startDownload } from './manager'
import catalog from './models.json'
import { useDownloadStore } from './store'

export type RecommendedModel = {
    id: string
    name: string
    description: string
    downloadUrl: string
    filename: string
    sizeBytes: number
    estimatedRuntimeBytes: number
    contextLength: number
    tags: string[]
}

export const recommendedModels: RecommendedModel[] = catalog.models
export const getDeviceMemory = () => {
    try {
        return getTotalMemory()
    } catch {
        return 0
    }
}
export const fitsDeviceMemory = (model: RecommendedModel, totalMemory: number) =>
    totalMemory > 0 && model.estimatedRuntimeBytes > 0
        ? model.estimatedRuntimeBytes <= totalMemory * 0.6
        : undefined

export const getRecommendedModels = (totalMemory: number) => {
    // If memory detection is unavailable, offer only the smallest known estimates.
    const budget = totalMemory > 0 ? totalMemory * 0.6 : 2 * 1024 ** 3
    return recommendedModels.filter(
        (model) => model.estimatedRuntimeBytes > 0 && model.estimatedRuntimeBytes <= budget
    )
}

export const downloadModel = (url: string, filename: string) => {
    const name = filename.trim()
    if (
        !name ||
        name.includes('/') ||
        name.includes('\\') ||
        !name.toLowerCase().endsWith('.gguf')
    ) {
        throw new Error('Choose a .gguf filename without directory separators.')
    }
    return startDownload({
        name,
        url,
        destination: AppDirectory.ModelPath + encodeURIComponent(name),
    })
}

let observingModels = false
export const observeModelDownloads = () => {
    if (observingModels) return
    observingModels = true
    useDownloadStore.subscribe((state, previous) => {
        for (const item of state.downloads) {
            if (item.status !== 'completed' || !item.destination.startsWith(AppDirectory.ModelPath))
                continue
            if (previous.downloads.find((old) => old.id === item.id)?.status === 'completed')
                continue
            // Register completed files regardless of which screen is currently open.
            void runBackgroundTask(async () => {
                await Model.createModelData(item.destination.slice(AppDirectory.ModelPath.length))
            }).catch(Logger.stackTrace)
        }
    })
}
