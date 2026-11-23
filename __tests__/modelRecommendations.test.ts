import { getRecommendedModels, recommendedModels } from '../lib/downloads/models'

jest.mock('@vali98/react-native-cpu-info', () => ({ getTotalMemory: () => 0 }))
jest.mock('../lib/background/service', () => ({}))
jest.mock('../lib/engine/Local/Model', () => ({}))
jest.mock('../lib/state/Logger', () => ({}))
jest.mock('../lib/utils/File', () => ({}))
jest.mock('../lib/downloads/store', () => ({}))
jest.mock('../lib/downloads/manager', () => ({}))

const gib = 1024 ** 3

test('recommendations respect the RAM budget and reserve larger models for larger devices', () => {
    const small = getRecommendedModels(4 * gib)
    expect(small.length).toBeGreaterThan(0)
    expect(small.every((model) => model.estimatedRuntimeBytes <= 4 * gib * 0.6)).toBe(true)
    expect(
        small.some((model) => model.id === 'qwen3-8b-q4-k-m' || model.id === 'qwen3.5-9b-q4-k-m')
    ).toBe(false)

    const large = getRecommendedModels(16 * gib)
    expect(large.some((model) => model.id === 'qwen3-8b-q4-k-m')).toBe(true)
    expect(large.some((model) => model.id === 'qwen3.5-9b-q4-k-m')).toBe(true)
})

test('unknown RAM only offers small models, and the budget boundary is inclusive', () => {
    expect(getRecommendedModels(0)).toEqual(getRecommendedModels(-1))
    expect(getRecommendedModels(0).every((model) => model.estimatedRuntimeBytes <= 2 * gib)).toBe(
        true
    )
    const model = recommendedModels[0]
    const total = model.estimatedRuntimeBytes / 0.6
    expect(getRecommendedModels(total)).toContain(model)
    expect(getRecommendedModels(total - 1)).not.toContain(model)
})
