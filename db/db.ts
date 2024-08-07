import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync, deleteDatabaseAsync } from 'expo-sqlite/next'
import * as schema from './schema'

//deleteDatabaseAsync('db.db')
const expo = openDatabaseSync('db.db')
export const db = drizzle(expo, { schema })
expo.execAsync('PRAGMA foreign_keys = ON;')
