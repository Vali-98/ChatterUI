import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
// enforce order - instance should be loaded first from recovery before db
import '@lib/storage/MMKV'

import * as schema from './schema'

export const sqliteDB = openDatabaseSync('db.db', { enableChangeListener: true })

sqliteDB.execSync(`
    PRAGMA foreign_keys = ON;
`)
export const db = drizzle(sqliteDB, { schema })

export type TableNames = {
    [K in keyof typeof schema]: (typeof schema)[K] extends { _: { name: infer TName } }
        ? TName & string
        : never
}[keyof typeof schema]
