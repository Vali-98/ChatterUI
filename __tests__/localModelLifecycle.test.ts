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
    Logger: { info: jest.fn(), warnToast: jest.fn(), errorToast: jest.fn() },
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
