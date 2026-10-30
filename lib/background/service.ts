import { t } from 'i18next'
import BackgroundService, { type BackgroundTaskOptions } from 'react-native-background-actions'

import { Logger } from '@lib/state/Logger'

const getOptions = (): BackgroundTaskOptions => ({
    taskName: 'chatterui_background_tasks',
    foregroundServiceType: ['dataSync'],
    taskTitle: t('background.title'),
    taskDesc: t('background.description'),
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#403737',
    linkingURI: 'chatterui://',
    progressBar: { max: 1, value: 0, indeterminate: true },
})

type Task = { run: () => Promise<void>; resolve: () => void; reject: (error: unknown) => void }
const tasks = new Set<Promise<void>>()
let launch: Task[] = []
let executing = false
let transitioning = false

// One native service hosts all work; done covers the submitted task's full lifetime.
export const runBackgroundTask = (run: () => Promise<void>): Promise<void> => {
    const done = new Promise<void>((resolve, reject) => {
        const task = { run, resolve, reject }
        if (executing) execute(task)
        else launch.push(task)
    })
    startService()
    return done
}
const startService = () => {
    if (executing || transitioning || !launch.length) return
    transitioning = true
    void BackgroundService.start(async () => {
        executing = true
        transitioning = false
        launch.splice(0).forEach(execute)
        while (tasks.size) await Promise.allSettled([...tasks])
        executing = false
        transitioning = true
        try {
            await BackgroundService.stop()
        } catch (error) {
            Logger.stackTrace(error)
        } finally {
            transitioning = false
            startService()
        }
        // The library also calls stop() when this callback resolves. We stop explicitly
        // and leave this callback pending to prevent its automatic stop killing a newer service.
        // stop() independently resolves the library's headless-task wrapper.
        return new Promise<void>(() => {})
    }, getOptions()).catch((error) => {
        transitioning = false
        launch.splice(0).forEach((task) => task.reject(error))
    })
}
const execute = (task: Task) => {
    const done = Promise.resolve().then(task.run)
    tasks.add(done)
    void done.then(task.resolve, task.reject).finally(() => tasks.delete(done))
}

export const updateDownloadNotification = (completed: number, total: number, count: number) => {
    if (!executing) return
    const options = getOptions()
    void BackgroundService.updateNotification({
        taskTitle: count ? t('background.downloading', { count }) : options.taskTitle,
        taskDesc: count ? t('background.downloadHint') : options.taskDesc,
        linkingURI: count ? 'chatterui://models' : options.linkingURI,
        progressBar:
            count && total > 0
                ? {
                      max: 100,
                      value: Math.min(100, Math.floor((completed / total) * 100)),
                      indeterminate: false,
                  }
                : { max: 1, value: 0, indeterminate: true },
    }).catch(Logger.stackTrace)
}

export const onBackgroundExpiration = (listener: () => void) => {
    BackgroundService.on('expiration', listener)
}
