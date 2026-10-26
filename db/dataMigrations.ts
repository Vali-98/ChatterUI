import { count, eq, sql } from 'drizzle-orm'

import { db } from '@db/db'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import { migrateSwipeReasoning } from './reasoningMigration'
import { chatSwipes } from './schema'

const MIGRATION_TAG = '[MIGRATION]'

enum MigrationId {
    MIGRATE_REASONING = 'migration.swipe_reasoning',
    MIGRATE_SWIPE_ID = 'migration.deprecate_swipe_id',
}

const migrationRoutines: Record<MigrationId, () => Promise<void>> = {
    [MigrationId.MIGRATE_REASONING]: async () => {
        migrateSwipeReasoning(db)
    },
    [MigrationId.MIGRATE_SWIPE_ID]: async () => {
        const [{ swipeCount }] = await db
            .select({ swipeCount: count(chatSwipes.id) })
            .from(chatSwipes)

        if (swipeCount === 0)
            return Logger.info(MIGRATION_TAG + ' swipe_id migration skipped, no messages') // assume fresh install

        const [{ activeCount }] = await db
            .select({ activeCount: count(chatSwipes.id) })
            .from(chatSwipes)
            .where(eq(chatSwipes.active, true))

        if (activeCount > 0)
            return Logger.info(MIGRATION_TAG + ' swipe_id migration skipped, active exists') // assume matched well

        Logger.info(MIGRATION_TAG + ' swipe_id migration checks passed, running')

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
        Logger.info(MIGRATION_TAG + ' swipe_id migration complete')
    },
}

// Flags belong to the currently installed database, so discard them after a database restore.
export const resetDataMigrationFlags = () => {
    for (const migrationId of Object.values(MigrationId)) mmkv.remove(migrationId)
}

type MigrateDataParams = {
    bypass?: boolean
}
/**
 * Application-side data transformations run after the schema migrations
 * @param MigrateDataParams
 */
export const migrateData = async ({ bypass }: MigrateDataParams = {}) => {
    for (const migrationId in migrationRoutines) {
        const migrationCheck = mmkv.getBoolean(migrationId)
        if (migrationCheck && !bypass) continue
        Logger.info(MIGRATION_TAG + ` Running migration: ${migrationId}`)
        try {
            await migrationRoutines[migrationId as MigrationId]()
            mmkv.set(migrationId, true)
        } catch (e) {
            Logger.errorToast(MIGRATION_TAG + ' Migration Failed')
            Logger.error(`${e}`)
            throw e
        }
    }
}
