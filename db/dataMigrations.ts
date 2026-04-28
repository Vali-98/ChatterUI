import { count, eq, sql } from 'drizzle-orm'

import { db } from '@db'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import { chatSwipes } from './schema'

enum MigrationId {
    MIGRATE_SWIPE_ID = 'migration.deprecate_swipe_id',
}

const migrationRoutines: Record<MigrationId, () => Promise<void>> = {
    [MigrationId.MIGRATE_SWIPE_ID]: async () => {
        const [{ swipeCount }] = await db
            .select({ swipeCount: count(chatSwipes.id) })
            .from(chatSwipes)

        if (swipeCount === 0) return Logger.info('swipe_id migration skipped, no messages') // assume fresh install

        const [{ activeCount }] = await db
            .select({ activeCount: count(chatSwipes.id) })
            .from(chatSwipes)
            .where(eq(chatSwipes.active, true))

        if (activeCount > 0) return Logger.info('swipe_id migration skipped, active exists') // assume matched well

        Logger.info('swipe_id migration running')

        await db.get(sql`
            UPDATE chat_swipes
            SET active = 1
            WHERE id IN (
            SELECT cs.id
            FROM chat_swipes cs
            JOIN chat_entries ce ON ce.id = cs.entry_id
            WHERE (
                SELECT COUNT(*)
                FROM chat_swipes cs2
                WHERE cs2.entry_id = cs.entry_id
                AND cs2.id < cs.id
            ) = ce.swipe_id
            );
        `)
    },
}

type MigrateDataParams = {
    bypass?: boolean
}
/**
 * This data migration is needed as drizzle-orm does not allow for DML in custom migrations
 * @param MigrateDataParams
 */
export const migrateData = async ({ bypass }: MigrateDataParams = {}) => {
    for (const migrationId in migrationRoutines) {
        const migrationCheck = mmkv.getBoolean(migrationId)
        if (migrationCheck && !bypass) continue
        Logger.info(`Running migration: ${migrationId}`)
        try {
            await migrationRoutines[migrationId as MigrationId]()
            mmkv.set(migrationId, true)
        } catch (e) {
            Logger.errorToast('Migration Failed')
            Logger.error(`${e}`)
        }
    }
}
