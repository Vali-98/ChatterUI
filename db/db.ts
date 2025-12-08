import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync, bundledExtensions } from 'expo-sqlite'

import * as schema from './schema'

//deleteDatabaseAsync('db.db')
export const sqliteDB = openDatabaseSync('db.db', { enableChangeListener: true })
const extension = bundledExtensions['sqlite-vec']
if (extension) sqliteDB.loadExtensionAsync(extension?.libPath, extension?.entryPoint)
export const db = drizzle(sqliteDB, { schema })
sqliteDB.execAsync('PRAGMA foreign_keys = ON;')
