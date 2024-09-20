import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync, deleteDatabaseAsync } from 'expo-sqlite'

import * as schema from './schema'

//deleteDatabaseAsync('db.db')
export const rawdb = openDatabaseSync('db.db', { enableChangeListener: true })
export const db = drizzle(rawdb, { schema })
rawdb.execAsync('PRAGMA foreign_keys = ON;')
