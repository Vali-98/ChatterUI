import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync, deleteDatabaseAsync } from 'expo-sqlite/next'
import * as schema from './schema'

//deleteDatabaseAsync('db.db')
export const rawdb = openDatabaseSync('db.db')
export const db = drizzle(rawdb, { schema })
rawdb.execAsync('PRAGMA foreign_keys = ON;')
