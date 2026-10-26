import { migrateData, resetDataMigrationFlags } from '../db/dataMigrations'
import { migrateSwipeReasoning } from '../db/reasoningMigration'
import { mmkv } from '../lib/storage/MMKV'

jest.mock('../db/db', () => ({ db: { select: () => ({ from: async () => [{ swipeCount: 0 }] }) } }))
jest.mock('../db/reasoningMigration', () => ({ migrateSwipeReasoning: jest.fn() }))
jest.mock('../lib/storage/MMKV', () => ({
    mmkv: { getBoolean: jest.fn(), set: jest.fn(), remove: jest.fn() },
}))
jest.mock('../lib/state/Logger', () => ({
    Logger: { info: jest.fn(), error: jest.fn(), errorToast: jest.fn() },
}))

beforeEach(() => jest.resetAllMocks())

test('one-time conversion is marked complete only after success', async () => {
    jest.mocked(mmkv.getBoolean).mockImplementation((key) => key !== 'migration.swipe_reasoning')
    await migrateData()
    expect(migrateSwipeReasoning).toHaveBeenCalledTimes(1)
    expect(mmkv.set).toHaveBeenCalledWith('migration.swipe_reasoning', true)
    jest.mocked(mmkv.getBoolean).mockReturnValue(true)
    await migrateData()
    expect(migrateSwipeReasoning).toHaveBeenCalledTimes(1)
})

test('a failed conversion is not marked complete and is reported to startup', async () => {
    jest.mocked(migrateSwipeReasoning).mockImplementationOnce(() => {
        throw new Error('conversion failed')
    })
    await expect(migrateData()).rejects.toThrow('conversion failed')
    expect(mmkv.set).not.toHaveBeenCalledWith('migration.swipe_reasoning', true)
})

test('restoring a database resets flags so restored legacy data is converted', () => {
    resetDataMigrationFlags()
    expect(mmkv.remove).toHaveBeenCalledWith('migration.swipe_reasoning')
    expect(mmkv.remove).toHaveBeenCalledWith('migration.deprecate_swipe_id')
})
