import { initLlama } from 'cui-llama.rn'

import { useDeferredTaskState } from '../lib/engine/generation/deferredState'
import { useLocalModelResourceState } from '../lib/engine/generation/localResource'
import { useGenerationState } from '../lib/engine/generation/state'
import { Llama } from '../lib/engine/Local/LlamaLocal'
import { Model } from '../lib/engine/Local/Model'

jest.mock('cui-llama.rn', () => ({ initLlama: jest.fn() }))
jest.mock('@vali98/react-native-fs', () => ({ closeFd: jest.fn(), getContentFd: jest.fn() }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../lib/engine/Local/GGML', () => ({ checkGGMLDeprecated: () => false }))
jest.mock('../lib/engine/Local/Model', () => ({
    Model: { getModelExists: jest.fn(), getModel: jest.fn(), verifyModelList: jest.fn() },
    KV: { useKVStore: { getState: () => ({ setKvCacheLoaded: jest.fn() }) } },
}))
jest.mock('../lib/state/Logger', () => ({
    Logger: { info: jest.fn(), error: jest.fn(), warnToast: jest.fn(), errorToast: jest.fn() },
}))
jest.mock('../lib/storage/MMKV', () => ({
    mmkv: { getBoolean: jest.fn() },
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))
jest.mock('../lib/utils/File', () => ({ AppDirectory: { SessionPath: '/session/' } }))
const tick = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve()
}
const model = (id: number) =>
    ({ id, name: `Model ${id}`, file_path: `/models/${id}.gguf`, quantization: '1' }) as any
const context = (events: string[]) => ({
    release: jest.fn(async () => {
        events.push('release model')
    }),
    releaseMultimodal: jest.fn(async () => {
        events.push('release projector')
    }),
    initMultimodal: jest.fn(async () => {
        events.push('load projector')
    }),
    isMultimodalEnabled: jest.fn(async () => true),
    getMultimodalSupport: jest.fn(async () => ({ vision: true, audio: false })),
})
beforeEach(() => {
    jest.clearAllMocks()
    useDeferredTaskState.setState({ tasks: {} })
    useGenerationState.setState({ generations: {} })
    Llama.useLlamaModelStore.setState({ model: undefined, context: undefined, mmproj: undefined })
    jest.mocked(Model.getModelExists).mockReturnValue(true)
})

test('a model switch unloads the previous model and loads its linked projector inside one queue entry', async () => {
    const events: string[] = []
    const previous = context(events)
    const next = context(events)
    Llama.useLlamaModelStore.setState({
        model: model(1),
        context: previous as any,
        mmproj: model(3),
    })
    jest.mocked(initLlama).mockImplementationOnce(async () => {
        events.push('load model')
        return next as any
    })
    jest.mocked(Model.getModel).mockResolvedValue(model(4))
    await Llama.useLlamaModelStore.getState().load({ ...model(2), mmprojLink: { mmproj_id: 4 } })
    expect(events).toEqual(['release projector', 'release model', 'load model', 'load projector'])
    expect(Llama.useLlamaModelStore.getState().model?.id).toBe(2)
    expect(Llama.useLlamaModelStore.getState().mmproj?.id).toBe(4)
    expect(useLocalModelResourceState.getState().operations).toBe(0)
})

test('a queued model load waits for native unloading to finish', async () => {
    const events: string[] = []
    const previous = context(events)
    let release!: () => void
    previous.release.mockImplementationOnce(
        () =>
            new Promise<void>((resolve) => {
                release = resolve
            })
    )
    Llama.useLlamaModelStore.setState({ model: model(1), context: previous as any })
    jest.mocked(initLlama).mockResolvedValueOnce(context(events) as any)
    const unload = Llama.useLlamaModelStore.getState().unload()
    const load = Llama.useLlamaModelStore.getState().load(model(2))
    await tick()
    expect(initLlama).not.toHaveBeenCalled()
    expect(useLocalModelResourceState.getState().operations).toBe(2)
    release()
    await Promise.all([unload, load])
    expect(initLlama).toHaveBeenCalledTimes(1)
    expect(Llama.useLlamaModelStore.getState().model?.id).toBe(2)
    expect(useLocalModelResourceState.getState().operations).toBe(0)
})

test('model unloading is blocked until a deferred local summary has settled', async () => {
    const previous = context([])
    Llama.useLlamaModelStore.setState({ model: model(1), context: previous as any })
    useDeferredTaskState.setState({
        tasks: {
            1: {
                id: 1,
                chatId: 1,
                kind: 'summary',
                mode: 'local',
                status: 'running',
                createdAt: 0,
            },
        },
    })
    await expect(Llama.useLlamaModelStore.getState().unload()).rejects.toThrow()
    expect(previous.release).not.toHaveBeenCalled()
    useDeferredTaskState.setState({ tasks: {} })
    await Llama.useLlamaModelStore.getState().unload()
    expect(previous.release).toHaveBeenCalledTimes(1)
})

test('native load progress is exposed until the model is ready', async () => {
    let ready!: () => void
    jest.mocked(initLlama).mockImplementationOnce((_params, onProgress) => {
        onProgress?.(35)
        return new Promise((resolve) => {
            ready = () => resolve(context([]) as any)
        })
    })
    const loading = Llama.useLlamaModelStore.getState().load(model(2))
    await tick()
    expect(useLocalModelResourceState.getState().activity).toEqual({
        kind: 'loading',
        name: 'Model 2',
        progress: 35,
    })
    expect(useLocalModelResourceState.getState().operations).toBe(1)
    ready()
    await loading
    expect(useLocalModelResourceState.getState().activity).toBeUndefined()
    expect(Llama.useLlamaModelStore.getState().model?.id).toBe(2)
})

test('failed native loading leaves a dismissible error and releases local capacity', async () => {
    jest.mocked(initLlama).mockRejectedValueOnce(new Error('out of memory'))
    await Llama.useLlamaModelStore.getState().load(model(2))
    expect(useLocalModelResourceState.getState()).toMatchObject({
        operations: 0,
        activity: { kind: 'loading', error: 'out of memory' },
    })
    expect(Llama.useLlamaModelStore.getState().model).toBeUndefined()
    useLocalModelResourceState.getState().dismissNotice()
    expect(useLocalModelResourceState.getState().activity).toBeUndefined()
    jest.mocked(initLlama).mockResolvedValueOnce(context([]) as any)
    await Llama.useLlamaModelStore.getState().load(model(2))
    expect(Llama.useLlamaModelStore.getState().model?.id).toBe(2)
})

test('a failed projector load is reported without marking the projector loaded', async () => {
    const nativeContext = context([])
    nativeContext.initMultimodal.mockRejectedValueOnce(new Error('unsupported projector'))
    jest.mocked(initLlama).mockResolvedValueOnce(nativeContext as any)
    jest.mocked(Model.getModel).mockResolvedValueOnce(model(3))
    await Llama.useLlamaModelStore.getState().load({ ...model(2), mmprojLink: { mmproj_id: 3 } })
    expect(Llama.useLlamaModelStore.getState().model?.id).toBe(2)
    expect(Llama.useLlamaModelStore.getState().mmproj).toBeUndefined()
    expect(useLocalModelResourceState.getState()).toMatchObject({
        operations: 0,
        activity: { kind: 'projector', error: 'unsupported projector' },
    })
})
