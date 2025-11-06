import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

import * as schema from './schema'

//deleteDatabaseAsync('db.db')
export const sqliteDB = openDatabaseSync('db.db', { enableChangeListener: true })
export const db = drizzle(sqliteDB, { schema })
sqliteDB.execAsync('PRAGMA foreign_keys = ON;')
